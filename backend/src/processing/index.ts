import Metadata from "../stores/metadata";
import Database from "../tools/database";
import Fetch from "../tools/fetch";
import FilterParser from "./parser";
import MusicSources from "./sources";
import { LOG, LOG_DEBUG } from "../main";
import { Playlist, PlaylistSource, PlaylistStatement } from "../shared/types/playlist";
import { FilterItem, STrack, SUser } from "../shared/types/server";
import FilterTask from "../stores/filtertask";
import Cache from "../stores/cache";

export interface FilterResult {
    message: string;
    status: number;
    playlist?: Playlist;
}

/**
 * The level of processing to be done. This is used to determine how much information is needed and logged
 */
export enum ProcessLevel {
    /** Default operation. Logs only basic general info and processes a playlsiy */
    PLAYLIST = 0,
    /** Used when checking if an info item matches the filters. Specific logs */
    INFO_ITEM = 1,
    /** Used for checking validity of playlist filters. No actual processing or logging */
    DRY_RUN = 2,
}

export default class Filters {
    static retry_after: Date | undefined;

    /**
     *                          Runs one filters for a playlist
     * @param task              The process associated with this process
     * @param playlist          Either a Playlist or a playlist_id
     * @param user              The user who owns the playlist
     * @param auto              Whether the playlist was auto updated
     */
    static async executePlaylist(task: FilterTask, playlist: Playlist | string, user: SUser, auto: boolean = false): Promise<void> {
        // If we are rate limited, wait until we are not
        if (Filters.retry_after !== undefined && Filters.retry_after > new Date())
            return task.finalize({ message: `Retry after:${Filters.retry_after.toLocaleString()}`, status: 429 });

        // Get the playlist if only an id is given
        if (typeof playlist === "string") {
            // Get the specific automated playlist
            playlist = await Database.getPlaylist(user.id, playlist);

            // If it does not exist, return
            if (playlist === undefined)
                return task.finalize({ message: `Playlist ${playlist} does not exist`, status: 404 });
        }

        // Update the playlist information. Spotify is probably correct
        const response = await Fetch.get(`/playlists/${playlist.id}`, { user })
        if (response.status !== 200) {
            LOG(`Executing failed: ${response.status} ${response.statusText}`);

            // If we are rate limited, set the retry_after date
            if (response.headers.get("retry-after") !== null) {
                Filters.retry_after = new Date(Date.now() + parseInt(response.headers.get("retry-after")) * 1000);
                LOG(`Retry after:${Filters.retry_after.toLocaleString()}`);
                return task.finalize({ message: `Retry after:${Filters.retry_after.toLocaleString()}`, status: 429 });
            } else {
                return task.finalize({ message: `Failed to get playlist ${playlist.id}`, status: response.status })
            }
        }

        // If the filtering is manual, we clear the user cache
        if (!auto)
            Cache.clearUserCache(user.id);

        const spotify_playlist = response.data;
        playlist.name = (spotify_playlist as Playlist).name;
        playlist.description = (spotify_playlist as Playlist).description;

        // Get tracks according to the specified sources
        const source_tracks = await MusicSources.get(playlist.sources, user, task);

        // Filter out duplicate tracks.
        const input = [...new Map(source_tracks.map(item => [item.id, item])).values()]

        // Update the playlist
        const {resulting_playlist, to_be_added, to_be_removed} = await Filters.processPlaylist(
            playlist,
            input,
            user,
            task
        );

        // Update the playlist
        await Promise.all([
            Filters.addTracksToSpotify(user, resulting_playlist.id, to_be_added),
            Filters.removeTracksFromSpotify(user, resulting_playlist.id, to_be_removed)
        ]);

        // If manual, keep only this log. Delete the rest
        if (!auto)
            resulting_playlist.logs = [task.log];

        // If auto, keep only the last 10 '(auto)' logs which are not duplicates
        else {
            // If the playlist did not change
            const previous_log = resulting_playlist.logs.slice(-1)[0];
            if (JSON.stringify(previous_log.sources) === JSON.stringify(task.log.sources) &&
                JSON.stringify(previous_log.filters) === JSON.stringify(task.log.filters))
                return task.finalize({ message: `Playlist ${playlist.id} did not change`, status: 304 });

            // Get the first log (which is a user log)
            const user_log         = resulting_playlist.logs.find(log => !log.name.startsWith("(auto)"));
            // Get the last 9 logs
            const most_recent_logs = resulting_playlist.logs.slice(-9).filter(log => log.name.startsWith("(auto)"));
            // Store the new log
            resulting_playlist.logs = [user_log, ...most_recent_logs, task.log];
        }

        // Update the database
        if (!(await Database.setPlaylist(user.id, resulting_playlist))) {
            LOG(`Failed to save a newly calculated playlist in database`);
            return task.finalize({ message: `Failed to save a newly calculated playlist in database`, status: 500 });
        }

        task.finalize({ message: `Successfully executed playlist ${playlist.id}`, status: 200, playlist: resulting_playlist });
    }


    /**
     *                  Updates the tracks in the playlist
     * @param playlist  The playlist config
     * @param tracks    Tracks to match
     */
    private static async processPlaylist(playlist: Playlist,
                                         input : FilterItem<any>[],
                                         user: SUser,
                                         task: FilterTask) {
        /** We must account for the following things:
         * - Nothing changed
         * - Included and/or excluded changed
         * - Filters changed (in which case included and excluded must be recalculated)
         * 1. Calculate the matched filter items
         * 2. Calculate the newly added and removed tracks between our old playlist config and the tracks in Spotify,
         *    assuming Spotify has the correct version.
         *      - added: tracks now present in Spotify where they weren't before
         *      - removed: tracks previously present where they are not anymore
         * 3. Process the matched items based on the added and removed tracks
         *      - matched:  items which macthed the filters
         *      - excluded: (original excluded + new manually removed tracks) and present in the filter
         *      - included: (original included + new manually added tracks) and not present in the filter
         * 4. Calculate the tracks we should add and remove in the Spotify playlist
         *      - to be added: tracks present in matched but not in Spotify
         *      - to be removed: tracks present in Spotify but not in matched
         * 5. Remove duplicates
         * */

        /**Get the playlist tracks from Spotify
         * First remove the url from the cache, preventing the cache from being used
         */
        delete Cache.url_cache[`/playlists/${playlist.id}/tracks`]

        const spotify_tracks = task.plevel == ProcessLevel.DRY_RUN ? [] :
            await Metadata.getMultipleTracks(`/playlists/${playlist.id}/tracks`,{
                user,
                pagination: true
            }) as FilterItem<STrack>[];

        // Get the tracks that are in the playlist
        let playlist_tracks = Filters.merge(playlist.matched_tracks, playlist.included_tracks)
            playlist_tracks = Filters.subtract(playlist_tracks, playlist.excluded_tracks)

        LOG_DEBUG(`0: spotify tracks: ${spotify_tracks.length}, old tracks: ${playlist_tracks.length}`)

        // 1. Match the tracks
        const matched_tracks = await FilterParser.process(
            playlist.filters,
            input,
            user,
            task
        );

        LOG_DEBUG(`1: filter input: ${input.length}, filter output: ${matched_tracks.length}`)

        // 2. Calculate the added and removed tracks
        const newly_added_tracks    = Filters.subtract(spotify_tracks, playlist_tracks)
        const newly_removed_tracks  = Filters.subtract(playlist_tracks, spotify_tracks)
        LOG_DEBUG(`2: added: ${newly_added_tracks.length}, removed: ${newly_removed_tracks.length}`)

        // 3. Process the matched items
        let excluded_tracks         = Filters.merge(playlist.excluded_tracks, newly_removed_tracks)
            excluded_tracks         = Filters.common(excluded_tracks, matched_tracks)
        let included_tracks         = Filters.merge(playlist.included_tracks, newly_added_tracks)
            included_tracks         = Filters.subtract(included_tracks, matched_tracks)
        task.log.filters.push(`Excluded ${excluded_tracks.length} tracks, included ${included_tracks.length} tracks`)
        LOG_DEBUG(`3: matched: ${matched_tracks.length}, included: ${included_tracks.length}, excluded: ${excluded_tracks.length}`)

        // 4. Calculate the tracks to add and remove
        let new_playlist_tracks   = Filters.merge(matched_tracks, included_tracks)
            new_playlist_tracks   = Filters.subtract(new_playlist_tracks, excluded_tracks)
        let to_be_added           = Filters.subtract(new_playlist_tracks, spotify_tracks)
        let to_be_removed         = Filters.subtract(spotify_tracks, new_playlist_tracks)
        LOG_DEBUG(`4: added: ${to_be_added.length}, removed: ${to_be_removed.length}`)

        // 5. Get unique tracks and remove those from the spotify tracks. These are duplicates
        const unique = Filters.common(spotify_tracks, spotify_tracks)
        const duplicates = Filters.subtract(spotify_tracks, unique, false)

        // The Spotify API removes all duplicates given only one track id, so we must add them back
        to_be_added   = Filters.merge(to_be_added, duplicates)
        to_be_removed = Filters.merge(to_be_removed, duplicates)
        LOG_DEBUG(`5: duplicates: ${duplicates.length}, removed: ${to_be_removed.length} (+${duplicates.length})`)

        playlist.matched_tracks     = matched_tracks.map(item => item.id)
        playlist.excluded_tracks    = excluded_tracks
        playlist.included_tracks    = included_tracks

        return {resulting_playlist: playlist, to_be_added, to_be_removed};
    }

    static async executeInfoItem(task: FilterTask,
                                 user: SUser,
                                 sources: PlaylistSource[],
                                 filters: PlaylistStatement): Promise<void> {
        const source_tracks = await MusicSources.get(sources, user, task);
        if (source_tracks.length === 0)
            return task.finalize({ message: `No tracks found`, status: 404 });

        // If the track does not exist, return
        const matched = await FilterParser.process(
            filters,
            source_tracks,
            user,
            task,
        );

        task.finalize({ message: `Ran filters`, status: 200 });
    }

    /**
     * Used as: result = value - value
     * Removes remove from tracks in the input
     * @param items Input list of tracks
     * @param remove Tracks to remove from the input list
     * @param dedupe If true, removes duplicate tracks from the input list
     * @returns Filtered track list
     */
    static subtract(items: FilterItem<any>[] | string[], remove: FilterItem<any>[] | string[], dedupe = true): string[] {
        /**If there are no tracks to filter OR
         * no tracks to remove, return nothing */
        if (items.length === 0)
            return [];
        if (remove.length === 0)
            return typeof items[0] === "string" ? (items as string[]) : (items as FilterItem<any>[]).map(track => track.id);

        // Convert STrack[] to string[]
        items  = Filters.getIds(items);
        remove = Filters.getIds(remove);

        // Only keep the tracks which are not in the remove list. Match only once
        if (dedupe) {
            items = (items as string[]).filter(track_id => !remove.some(remove_id => remove_id === track_id))
            items = [...new Set(items)];
        } else {
            // Removes the first occurrence of every item
            for (const r of remove) {
                const index = (items as string[]).findIndex(item => item === r);
                if (index !== -1)
                    (items as string[]).splice(index, 1);
            }
        }

        return items;
    }

    /**
     * Returns Track present in both lists
     * @param list1 Track list 1
     * @param list2 Track list 2
     * @param dedupe If true, removes duplicate tracks from the input list
     * @returns Filtered track list
     */
    static common(list1: FilterItem<any>[] | string[], list2: FilterItem<any>[] | string[], dedupe = true): string[] {
        /**If there are no tracks to filter OR
         * no tracks to remove, return nothing */
        if (list1.length === 0 || list2.length === 0)
            return [];

        // Convert FilterItem<any>[] to string[]
        list1 = Filters.getIds(list1);
        list2 = Filters.getIds(list2);

        // Only keep the tracks which are not in the remove list
        const items = (list1 as string[]).filter(t1_id => (list2 as string[]).some(t2_id => t2_id === t1_id))
        return dedupe ? [...new Set(items)] : items;
    }

    /**
     * Merges both lists
     * @param list1 Track list 1
     * @param list2 Track list 2
     * @param dedupe If true, removes duplicate tracks from the input list
     * @returns Merged list
     */
     static merge(list1: FilterItem<any>[] | string[], list2: FilterItem<any>[] | string[], dedupe = true): string[] {
        // Convert FilterItem<any>[] to string[]
        list1 = Filters.getIds(list1);
        list2 = Filters.getIds(list2);

        // Only keep the tracks which are not in the remove list
        const items = (Filters.getIds(list1) as string[]).concat(list2 as string[])
        return dedupe ? [...new Set(items)] : items;
    }

    /**
     * Adds tracks to a playlist belonging to a user
     * @param user User whose playlist is to be updated
     * @param playlist_id ID of the playlist to be updated
     * @param tracks Tracks to add
     * @param retries If it fails to add, how
     */
    static async addTracksToSpotify(user: SUser, playlist_id: string, tracks: string[], retries=3) {
        const tasks = []

        for (let i = 0; i < tracks.length; i += 100) {
            tasks.push(
                Fetch.post(`/playlists/${playlist_id}/tracks`, {
                    user,
                    data: {
                        uris: tracks.slice(i, i + 100).map(track => `spotify:track:${track}`),
                        position: 0
                    }
                }).then(response => {
                    if (retries > 0) {
                        // We don't want to add duplicate tracks, so first, remove them if they exist
                        Filters.removeTracksFromSpotify(user, playlist_id, tracks);

                        // Ensured that no duplicate tracks will be added, try adding them again.
                        return setTimeout(async () => await Filters.addTracksToSpotify(user, playlist_id, tracks, retries - 1), 1000);
                    }
                })
            )
        }

        await Promise.all(tasks)
    }

    /**
     * Removes tracks from a playlist belonging to a user
     * @param user User whose playlist is to be updated
     * @param playlist_id ID of the playlist to be updated
     * @param tracks Tracks to add
     * @param retries If it fails to add, how
     */
    static async removeTracksFromSpotify(user: SUser, playlist_id: string, tracks: string[], retries=3) {
        const tasks = []

        for (let i = 0; i < tracks.length; i += 100) {
            tasks.push(
                Fetch.delete(`/playlists/${playlist_id}/tracks`, {
                    user,
                    data: {tracks: tracks.slice(i, i + 100).map((track: string) => {
                        return {uri: `spotify:track:${track}`}}
                    )}
                }).catch(response => {
                    if (retries > 0)
                        return setTimeout(async () => await Filters.removeTracksFromSpotify(user, playlist_id, tracks, retries - 1), 1000);
                })
            )
        }

        await Promise.all(tasks)
    }

    /**
     * Converts a FilterItem<any>[] to a list of ids. If the input was already a string[], it will be returned
     * @param list Items to get the ids from. Can be just a string[]
     */
    static getIds(list: FilterItem<any>[] | string[]): string[] {
        if (typeof list[0] === "string")
            return list as string[];

        return (list as FilterItem<any>[]).map(t => t.id);
    }
}