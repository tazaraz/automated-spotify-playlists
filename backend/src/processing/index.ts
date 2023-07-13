import Metadata from "../stores/metadata";
import Snapshots from "../stores/snapshots";
import Database from "../tools/database";
import Fetch from "../tools/fetch";
import FilterParser from "./parser";
import MusicSources from "./sources";
import { LOG_DEBUG } from "../main";
import { Playlist } from "../types/playlist";
import { FilterItem, STrack, SUser } from "../types/server";
import FilterLog from "../stores/filterlog";

export default class Filters {
    /**
     *                          Runs one filters for a playlist
     * @param playlist   Either a Playlist or a playlist_id
     * @param user_id           The user_id of the user
     */
    static async execute(playlist: Playlist | string, user: SUser) {
        // Get the playlist if only an id is given
        if (typeof playlist === "string") {
            // Get the specific smart playlist
            playlist = await Database.getPlaylist(user.id, playlist);

            // If it does not exist, return
            if (playlist === undefined)
                return false;
        } else
            playlist = playlist;

        if (FilterLog.exists(playlist.id))
            return true;

        const log = new FilterLog(playlist.id);

        // Update the playlist information. Spotify is probably correct
        const response = await Fetch.get(`/playlists/${playlist.id}`, { user })
        if (response.status === 404) return false;
        if (response.status !== 200) throw new Error(`Executing failed: ${response.status} ${response.statusText}`);

        const spotify_playlist = response.data;
        playlist.name = (spotify_playlist as Playlist).name;
        playlist.description = (spotify_playlist as Playlist).description;

        // Get tracks according to the specified sources
        const source_tracks = await MusicSources.get(playlist.track_sources, user, log);

        // Filter out duplicate tracks.
        const input = [...new Map(source_tracks.map(item => [item.id, item])).values()]

        // Update the playlist
        const {resulting_playlist, to_be_added, to_be_removed} = await Filters.process(playlist, input, user, log);

        // Update the playlist
        await Promise.all([
            Filters.addTracksToSpotify(user, resulting_playlist.id, to_be_added),
            Filters.removeTracksFromSpotify(user, resulting_playlist.id, to_be_removed)
        ]);

        // Get the log
        resulting_playlist.log = log.finalize();

        // Update the database
        if (!(await Database.setPlaylist(user.id, resulting_playlist)))
            throw new Error("Failed to save a newly calculated playlist in database");

        return resulting_playlist;
    }


    /**
     *                  Updates the tracks in the playlist
     * @param playlist  The playlist config
     * @param tracks    Tracks to match
     */
    static async process(playlist: Playlist, input : FilterItem[], user: SUser, log: FilterLog, dryrun=false) {
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
         *      - included: (original included + new manually added tracks) and not present in the filter
         *      - excluded: (original excluded + new manually removed tracks) and present in the filter
         *      - matched:  tracks from both the result and included AND NOT tracks from the excluded
         * 4. Calculate the tracks we should add and remove in the Spotify playlist
         *      - to be added: tracks present in matched but not in Spotify
         *      - to be removed: tracks present in Spotify but not in matched
         * */

        /**Get the playlist tracks from Spotify
         * First remove the url from the cache, preventing the cache from being used
         */
        delete Metadata.url_cache.tracks[`/playlists/${playlist.id}/tracks`]
        const spotify_tracks = dryrun ? [] :
            await Metadata.getMultipleTracks(`/playlists/${playlist.id}/tracks`,{
                user,
                pagination: true
            }) as FilterItem[];

        // Get the tracks that are in the playlist
        let playlist_tracks = Filters.merge(playlist.matched_tracks, playlist.included_tracks)
            playlist_tracks = Filters.subtract(playlist_tracks, playlist.excluded_tracks)

        spotify_tracks.forEach(item => (item as FilterItem).kind = "track");
        LOG_DEBUG(`0: spotify tracks: ${spotify_tracks.length}, old tracks: ${playlist_tracks.length}`)

        // 1. Match the tracks
        const filter_tracks = await FilterParser.process(
            playlist.filters,
            input,
            user,
            log,
            dryrun
        );

        LOG_DEBUG(`1: filter input: ${input.length}, filter output: ${filter_tracks.length}`)
        LOG_DEBUG(playlist.log.filters)

        // 2. Calculate the added and removed tracks
        const newly_added_tracks    = Filters.subtract(spotify_tracks, playlist_tracks)
        const newly_removed_tracks  = Filters.subtract(playlist_tracks, spotify_tracks)
        LOG_DEBUG(`2: added: ${newly_added_tracks.length}, removed: ${newly_removed_tracks.length}`)

        // 3. Process the matched items
        let included_tracks         = Filters.merge(playlist.included_tracks, newly_added_tracks)
            included_tracks         = Filters.subtract(included_tracks, filter_tracks)
        let excluded_tracks         = Filters.merge(playlist.excluded_tracks, newly_removed_tracks)
            excluded_tracks         = Filters.common(excluded_tracks, filter_tracks)
        let matched_tracks          = Filters.subtract(filter_tracks, excluded_tracks)

        LOG_DEBUG(`3: matched: ${matched_tracks.length}, included: ${included_tracks.length}, excluded: ${excluded_tracks.length}, matched: ${matched_tracks.length}`)

        // 4. Calculate the tracks to add and remove
        const new_playlist_tracks   = Filters.merge(matched_tracks, included_tracks)
        const to_be_added           = Filters.subtract(new_playlist_tracks, spotify_tracks)
        const to_be_removed         = Filters.subtract(spotify_tracks, new_playlist_tracks)
        LOG_DEBUG(`4: added: ${to_be_added.length}, removed: ${to_be_removed.length}`)

        playlist.included_tracks    = included_tracks
        playlist.excluded_tracks    = excluded_tracks
        playlist.matched_tracks     = matched_tracks

        return {resulting_playlist: playlist, to_be_added, to_be_removed};
    }

    static toString(list: (FilterItem | string)[]): string[] {
        return list.map(item => typeof item === "string" ? item : item.id);
    }

    /**
     * Used as: result = value - value
     * Removes remove from tracks in the input
     * @param items Input list of tracks
     * @param remove Tracks to remove from the input list
     * @returns Filtered track list
     */
    static subtract(items: FilterItem[] | string[], remove: FilterItem[] | string[]): string[] {
        /**If there are no tracks to filter OR
         * no tracks to remove, return nothing */
        if (items.length === 0)
            return [];
        if (remove.length === 0)
            return typeof items[0] === "string" ? (items as string[]) : (items as STrack[]).map(track => track.id);

        // Convert STrack[] to string[]
        if (typeof items[0] !== "string")
            items = (items as STrack[]).map(t => t.id);
        if (typeof remove[0] !== "string")
            remove = (remove as STrack[]).map(t => t.id);

        // Only keep the tracks which are not in the remove list
        items = (items as string[]).filter(track_id => !remove.some(remove_id => remove_id === track_id));
        return [...new Set(items)]
    }

    /**
     * Returns tracks present in both lists
     * @param list1 Track list 1
     * @param list2 Track list 2
     * @returns Filtered track list
     */
    static common(list1: STrack[] | string[], list2: STrack[] | string[]): string[] {
        /**If there are no tracks to filter OR
         * no tracks to remove, return nothing */
        if (list1.length === 0 || list2.length === 0)
            return [];

        // Convert STrack[] to string[]
        if (typeof list1[0] !== "string")
            list1 = (list1 as STrack[]).map(t => t.id);
        if (typeof list2[0] !== "string")
            list2 = (list2 as STrack[]).map(t => t.id);

        // Only keep the tracks which are not in the remove list
        const items = (list1 as string[]).filter(t1_id => (list2 as string[]).some(t2_id => t2_id === t1_id));
        return [...new Set(items)]
    }

    /**
     * Merges both lists
     * @param list1 Track list 1
     * @param list2 Track list 2
     * @returns Merged list
     */
     static merge(list1: STrack[] | string[], list2: STrack[] | string[]): string[] {
        // Convert STrack[] to string[]
        if (typeof list1[0] !== "string")
            list1 = (list1 as STrack[]).map(t => t.id);
        if (typeof list2[0] !== "string")
            list2 = (list2 as STrack[]).map(t => t.id);

        // Only keep the tracks which are not in the remove list
        const items = (list1 as string[]).concat(list2 as string[]);
        return [...new Set(items)]
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
                    if (response.status === 201)
                        Snapshots.set(playlist_id, user.id, response.data.snapshot_id);

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
                    if (response.status === 201)
                        Snapshots.set(playlist_id, user.id, response.data.snapshot_id);

                    if (retries > 0)
                        return setTimeout(async () => await Filters.removeTracksFromSpotify(user, playlist_id, tracks, retries - 1), 1000);
                })
            )
        }

        await Promise.all(tasks)
    }
}