import { Store, Pinia } from "pinia-class-component";

import User from "./user";
import Fetch from "./fetch";
import { CTrack, CArtist, CPlaylist } from "~/../backend/src/shared/types/client";
import FetchError from "./error";
import Editor from "./editor";

export type { CPlaylist };

/**
 * Contains ids beloning to tracks (unloaded), or tracks themselves (loaded)
 */
export type PartialTrackList = (CTrack | string)[];

/**
 * The track kind is used to determine what tracks to load when loading a playlist
 * The following are used in all playlists:
 * - `all` The tracks as shown in Spotify
 *
 * The following are only used in automated playlists:
 * - `matched` The tracks which matched the filter
 * - `excluded` The tracks which were manually excluded by the user
 * - `included` The tracks which were manually included by the user
 *
 * The following are only used in the library:
 * - `unused` The tracks which are not in any playlist
 * - `unused-auto` The tracks which are not in any automated playlist
 */
export type TrackKind = "all" | "matched" | "excluded" | "included" | "unused" | "unused-auto";

/**
 * This interface represents the data required for a playlist to be viewed in the main view
 */
export interface LoadedPlaylist extends CPlaylist {
    /** The index of the playlist in the storage */
    index: number;
    /** To whom the playlist belongs */
    ownership: "user" | "following" | "none";

    /** Contains matched and included tracks */
    all_tracks: PartialTrackList;
    /** Tracks which matched the filter */
    matched_tracks: PartialTrackList;
    /** Tracks which were manually excluded by the user */
    excluded_tracks: PartialTrackList;
    /** Tracks which were manually included by the user */
    included_tracks: PartialTrackList;
}

/**
 * The library extends the Loaded Playlist interface, but does not use any of the following:
 * - `index` (it has its own special location)
 * - `ownership` (it is always the user's library)
 * - `matched_tracks`, `excluded_tracks`, `included_tracks` (it does not have a filter)
 * */
export interface LibraryPlaylist extends LoadedPlaylist {
    /** Contains all the tracks in the library */
    all_tracks: PartialTrackList;
    /** Contains tracks which do not appear in any playlist. Should be manually calculated and populated */
    unused_tracks: PartialTrackList;
    /** Contains tracks which do not appear in any automatic playlist. Should be manually calculated and populated */
    unused_auto_tracks: PartialTrackList;
}

@Store
/**
 * Stores the playlists of the user:
 * - The playlists the user has
 * - The playlist the user is currently viewing
 * - The playlist the user is currently editing
 * This store also handles the loading, saving and editing of the playlists and syncing them to the server
 */
export default class Playlists extends Pinia {
    user!: User;

    /** Contains all the playlists from the user */
    storage!: CPlaylist[];
    /** The playlist which is currently in view. Different functionality from the editing variable */
    loaded!: LoadedPlaylist;
    /** The automated playlist the user is currently editing */
    editor!: Editor;
    /** If the user already has an automated playlist which is not yet pushed. Stored here for components to access */
    unpublished: CPlaylist | null = null;
    /** Contains the library */
    library: LibraryPlaylist = null as any;

    // If there are any automated playlists
    hasAutomatedPlaylists: boolean = false;

    private loadingUserPlaylists: boolean | Promise<any> = false;
    // Whether all the playlist have their track ids loaded
    private loadingPlaylistsTrackIds: boolean | Promise<any> = false;

    setUser(user: User){
        this.user = user;
    }

    /**
     * Loads all the playlists the user has
     */
    async loadUserPlaylists(){
        await this.loadingUserPlaylists;

        if (this.storage !== undefined)
            return true;

        this.loadingUserPlaylists = new Promise(async resolve => {
            let playlists: CPlaylist[] = [];
            this.storage = [];

            // Get the user playlists from Spotify
            const res_p = await Fetch.get<any[]>('spotify:/me/playlists', {pagination: true});
            if (res_p.status !== 200) {
                FetchError.create({ status: res_p.status, message: "Asked Spotify too often for your (or someone else's) playlists. The playlists will be loaded once Spotify again allows the request. Please wait a little to before reloading the page.", duration: 0 });
                return resolve(false);
            }

            res_p.data.forEach(playlist => {
                playlists.push({
                    id:         playlist.id,
                    user_id:    playlist.owner.id,
                    name:       playlist.name,
                    description: playlist.description,
                    image:      Fetch.bestImage(playlist.images),
                    owner:      { id: playlist.owner.id, display_name: playlist.owner.display_name },
                    all_tracks: Array(playlist.tracks.total).fill(""),
                } as CPlaylist)
            });

            // Get automated playlists
            const res_s = await Fetch.get<CPlaylist[]>('server:/playlists');
            if (res_s.status !== 200) {
                FetchError.create({ status: res_s.status, message: 'The server did not respond accordingly when retrieving your automated playlists' });
                return resolve(false);
            }

            if (res_s.data.length > 0) this.hasAutomatedPlaylists = true;

            /**Overwrite the playlists with the automated playlists
             * NOTE: Not all playlists are actually automated playlists, but for typing we treat them as if
             *       Hence we check everywhere there is a distinction */
            this.storage = playlists.map(playlist => {
                const automatedPlaylist = res_s.data.find(automated => automated.id === playlist.id);
                if (automatedPlaylist) {
                    // Set some basic stuff
                    automatedPlaylist.image = playlist.image;
                    automatedPlaylist.owner = playlist.owner;
                    // Keep this one present as well
                    automatedPlaylist.all_tracks = Array(playlist.all_tracks.length).fill("");
                }

                return automatedPlaylist || playlist;
            });

            resolve({ status: 200 });
        })

        return await this.loadingUserPlaylists;
    }

    /**
     * Loads tracks from your library
     */
    async loadUserLibrary(){
        if (!this.storage)
            await this.loadUserPlaylists();

        if (this.library) {
            this.loaded = this.library;
            return true;
        }

        // We load the rest of the content later
        this.library = {
            id: "library",
            name: "Library",
            image: "https://t.scdn.co/images/3099b3803ad9496896c43f22fe9be8c4.png",
            ownership: "user",
            owner: { id: this.user.info!.id, display_name: this.user.info!.name, country: this.user.info!.country },
            user_id: this.user.info!.id,

            all_tracks: [],
            unused_playlist_tracks: [],
            unused_autoplaylist_tracks: [],
        } as any as LibraryPlaylist;

        // Load the library tracks
        const library = (await Fetch.get(`spotify:/me/tracks?limit=50`)).data
        const all_tracks = Array(library.total).fill("")
              all_tracks.splice(0, 50, ...Fetch.format(library).map((track: any) => this.convertToCTrack(track)))

        // We load the rest of the content later
        this.library.all_tracks = all_tracks;
        this.loaded = this.library;
    }

    /**
     * Loads a playlist by its ID
     * @param id ID of the playlist to load
     */
    async loadUserPlaylistByID(id: string){
        // If the storage does not exist
        if (!this.storage)
            await this.loadUserPlaylists();

        // Save the loading playlist ID
        this.loadingPlaylistID = id;

        let index = this.storage.findIndex(p => p.id === id);
        if (index === -1) return false;

        // Partially load the playlist
        this.loaded = {
            ...this.copy(this.storage[index]),
            index: index,
            ownership: this.playlistOwnership(this.storage[index]),
            owner: { id: this.storage[index].owner.id, display_name: this.storage[index].owner.display_name }
        } as LoadedPlaylist

        // Reset the loading playlist ID
        this.loadingPlaylistID = "";

        return true;
    }

    /**
     * Loads chunks of tracks from a playlist. If you want to display more than the limit, update the offset and call
     * the function again.
     * @param playlist Playlist to load the tracks for
     * @param kind What tracks to load
     * @param offset Offset to start loading from
     * @param limit How many tracks to load at once
     */
    async loadPlaylistTracks(kind: TrackKind = "all",
                             offset: number = 0,
                             limit: number = 50): Promise<{
                                all: PartialTrackList,
                                matched: PartialTrackList,
                                excluded: PartialTrackList,
                                included: PartialTrackList,
                                unused: PartialTrackList,
                                unused_auto: PartialTrackList
                             }> {
        let all: PartialTrackList      = this.loaded.all_tracks || [];
        let matched: PartialTrackList  = this.loaded.matched_tracks || [];
        let excluded: PartialTrackList = this.loaded.excluded_tracks || [];
        let included: PartialTrackList = this.loaded.included_tracks || [];
        let unused: PartialTrackList    = this.library?.unused_tracks || [];
        let unused_auto: PartialTrackList = this.library?.unused_auto_tracks || [];

        if (this.loaded.id === "unpublished")
            return { all, matched, included, excluded, unused, unused_auto };

        /** If it is not an automated playlist, use the Spotify playlist endpoint */
        if (kind == 'all' || this.loaded.filters === undefined) {
            const url = this.loaded.id == 'library' ? '/me/tracks' : `/playlists/${this.loaded.id}/tracks`;

            // Check if the offset is already loaded
            if ((all[offset] as CTrack)?.id === undefined || typeof (all[offset] as CTrack)?.id === "string") {
                let tracks = (await Fetch.get<any[]>(`spotify:${url}`, { offset })).data
                             .map((track: any) => this.convertToCTrack(track))

                /* Check if the Spotify result actually contains tracks
                 * or [] if either the offset is too high or the playlist does not contain any tracks */
                if (all.length == 0 || all[offset] === undefined)
                    return { all, matched, included, excluded, unused, unused_auto };
                /** Otherwise, we are missing tracks */
                else if (tracks.length == 0) {
                    // Wait a moment
                    await new Promise(resolve => setTimeout(resolve, 500))
                    // Try again
                    return this.loadPlaylistTracks(kind, offset, limit);
                }

                // Insert the tracks into the all_tracks at the offset
                all.splice(offset, limit, ...tracks);

                // For all track lists, replace the ids with the tracks
                for (const target of [all, matched, excluded, included, unused, unused_auto]) {
                    for (const track of tracks) {
                        const index = target.findIndex(t => t === track.id);
                        if (index !== -1) target[index] = track;
                    }
                }
            }
        } else {
            /** The all, matched, excluded and included tracks include either the ids or the tracks themselves
             * We do not need to load the already loaded tracks again */
            let target = kind === "matched" ? matched :
                         kind === "excluded" ? excluded :
                         kind === "included" ? included :
                         kind === "unused" ? unused : unused_auto;

            // Get all tracks from [offset: offset + limit] which are still a string (their id only and thus not loaded)
            const missing = target.slice(offset, offset + limit).filter(track => typeof track === "string") as string[];
            if (missing.length > 0) {
                // Get the missing tracks from spotify
                let tracks = (await Fetch.get<any[]>('spotify:/tracks', { ids: missing })).data
                             .map((track: any) => this.convertToCTrack(track))

                // For all track lists, replace the ids with the tracks
                for (target of [all, matched, excluded, included, unused, unused_auto]) {
                    for (const track of tracks) {
                        const index = target.findIndex(t => t === track.id);
                        if (index !== -1) target[index] = track;
                    }
                }
            }
        }

        // Save the tracks
        this.loaded.all_tracks      = all;
        this.loaded.matched_tracks  = matched;
        this.loaded.excluded_tracks = excluded;
        this.loaded.included_tracks = included;
        if (this.loaded.id === "library") {
            this.library.unused_tracks = unused;
            this.library.unused_auto_tracks = unused_auto;
        }

        return { all, matched, excluded, included, unused, unused_auto };
    }


    /**
     * Populates the placeholder ids of the `all_tracks` field in the storage with the actual values from Spotify
     */
    async loadPlaylists_all_tracks() {
        await this.loadUserPlaylists();

        let playlists: CPlaylist[] = [];
        /** Loop through all playlists and check if there is a playlist with an uninitialized ("") `all_track` track */
        for (const playlist of this.storage) {
            if (!playlist.all_tracks || playlist.all_tracks.some(t => t === "")) {
                playlists.push(playlist);
            }
        }

        if (!this.loadingPlaylistsTrackIds) {
            // Try to get all the track ids for each playlist
            this.loadingPlaylistsTrackIds = Promise.all(playlists.map(async playlist => {
                // If the playlist is not an automated playlist, we need to load the track ids
                const tracks = (await Fetch.get<any[]>(`spotify:/playlists/${playlist.id}/tracks`, {
                    query: { fields: 'items.track.id' },
                    pagination: true
                })).data;

                this.storage.find(p => p.id == playlist.id)!.all_tracks = tracks.map(track => track.id);
            }))

            // Wait to complete
            await this.loadingPlaylistsTrackIds;
            this.loadingPlaylistsTrackIds = true;
        }

        // Wait for the track ids to be loaded
        await this.loadingPlaylistsTrackIds;
    }

    /**
     * Builds a new automated playlist
     */
    buildAutomatedPlaylist() {
        return {
            id:             "unpublished",
            user_id:        this.user?.info?.id || "unkown",
            name:           "Automated Playlist",
            description:    '',
            image:          '',
            sources:        [{origin: "Library", value: ""}],
            filters: {
                mode: "all",
                filters: []
            },
            all_tracks:         [],
            matched_tracks:     [],
            excluded_tracks:    [],
            included_tracks:    [],
            logs:               [],
            owner: {
                id: this.user.info!.id              || "unknown",
                display_name: this.user.info!.name  || "you",
                country: this.user.info!.country    || "unknown"
            },
        } as CPlaylist;
    }

    /**
     * Adds a new automated playlist to the storage array
     */
    addAutomatedPlaylist() {
        // If the user already has an automated playlist, return it
        if (this.unpublished)
            return this.storage.findIndex(p => p.id === this.unpublished!.id);

        const playlist = this.buildAutomatedPlaylist();

        this.unpublished = playlist;
        this.hasAutomatedPlaylists = true;
        return this.storage.push(playlist) - 1;
    }

    /**
     * Moves tracks from matched_tracks to excluded_tracks
     * @param tracks Track to move
     */
    removeMatched(tracks: PartialTrackList){
        // Remove the tracks from the from the origin
        this.loaded.matched_tracks = this.filterOut(this.loaded.matched_tracks, tracks);
        this.loaded.all_tracks     = this.filterOut(this.loaded.all_tracks, tracks);

        // Add the tracks to the destination
        this.loaded.excluded_tracks.push(...tracks);
        this.loaded.excluded_tracks.sort();

        // Let the server know the change
        this.removeTracks(this.loaded, 'matched', tracks.map(t => (t as CTrack).id || (t as string)))
    }

    /**
     * Moves tracks from excluded_tracks to matched_tracks
     * @param tracks Tracks to move
     */
    removeExcluded(tracks: PartialTrackList){
        // Remove the tracks from the from the origin
        this.loaded.excluded_tracks = this.filterOut(this.loaded.excluded_tracks, tracks);

        // Add the tracks to the destination
        this.loaded.matched_tracks.push(...tracks);
        this.loaded.matched_tracks.sort();

        // Let the server know the change
        this.removeTracks(this.loaded, 'excluded', tracks.map(t => (t as CTrack).id || (t as string)))
    }

    /**
     * Moves tracks from excluded_tracks to matched_tracks
     * @param tracks Tracks to move
     */
    removeIncluded(tracks: PartialTrackList){
        // Remove the tracks from the from the origin
        this.loaded.included_tracks = this.filterOut(this.loaded.included_tracks, tracks);
        this.loaded.all_tracks      = this.filterOut(this.loaded.all_tracks, tracks);

        // Let the server know the change
        this.removeTracks(this.loaded, 'included', tracks.map(t => (t as CTrack).id || (t as string)))
    }

    /**
     * Creates a complete memory copy of a playlist
     * @param playlist playlist to duplicate
     */
    copy<T>(playlist: T): T {
        return JSON.parse(JSON.stringify(playlist));
    }

    /**
     * Deletes a playlist on the server if automated and unfollows it on Spotify
     * @param playlist Playlist to delete
     */
    async delete(playlist: LoadedPlaylist) {
        if (playlist.id !== "unpublished") {
            let result = await Fetch.delete(`spotify:/playlists/${playlist.id}/followers`);

            if (result.status !== 200)
                return false;

            result = await Fetch.delete("server:/playlist", { data: { id: playlist.id } })

            // We failed to delete the playlist on the server, so we follow it again
            if (result.status !== 200) {
                await Fetch.put(`spotify:/playlists/${playlist.id}/followers`);
                return false;
            }
        } else {
            // Remove the unpublished playlist
            this.unpublished = null;
        }

        // Remove the playlist from the list
        this.storage = this.storage.filter(item => item.id !== playlist.id);

        // If there are more automated playlists
        this.hasAutomatedPlaylists = this.storage.some(playlist => playlist.filters !== undefined);

        // Unload the editor
        this.editor.close();
        return true;
    }

    /**
     * Follows a playlist for the user
     * @param playlist Playlist to follow
     */
    async follow(playlist: LoadedPlaylist) {
        const result = await Fetch.put(`spotify:/playlists/${playlist.id}/followers`);

        if (result.status !== 200)
            return false;

        this.storage.unshift(this.convertToCPlaylist(playlist));
        return true;
    }

    /**
     * Unfollows a playlist
     * @param playlist Playlist to unfollow
     */
    async unfollow(playlist: LoadedPlaylist) {
        const result = await Fetch.delete(`spotify:/playlists/${playlist.id}/followers`);

        if (result.status !== 200)
            return false;

        this.storage = this.storage.filter(item => item.id !== playlist.id);
        return true;
    }

    /**
     * Saves a playlist to the this.storage array
     * @param playlist Playlist to save
     */
    async save(playlist: LoadedPlaylist | CPlaylist) {
        // If it is the editing playlist, convert and save.
        if ((playlist as LoadedPlaylist).index !== undefined) {
            this.storage[(playlist as LoadedPlaylist).index] = this.convertToCPlaylist((playlist as LoadedPlaylist));
        } else {
            const index = this.storage.findIndex(p => p.id === playlist.id)
            this.storage[index] = (playlist as CPlaylist);
        }
    }

    /** Update whether the user:
     * - is the owner of the playlist
     * - liked the playlist
     * - is info viewing the playlist
     * @param playlist Ownership of the playlist
     */
    playlistOwnership(playlist: CPlaylist): LoadedPlaylist['ownership'] {
        const user = this.storage.find(p => p.id === playlist.id) !== undefined;
        const owner = (playlist.owner?.id || playlist.user_id) === this.user.info!.id;
        return user && owner ? "user" : user && !owner ? "following" : "none";
    }

    /**
     * Returns the playlists in which the track appears
     * @param trackId The id of the track
     */
    async trackAppearsIn(trackId: string){
        await this.loadUserPlaylists();
        await this.loadPlaylists_all_tracks();

        // Return the playlists in which the track appears
        return this.storage.filter(playlist => {
            // Check if it exists in the all_tracks
            if (playlist.all_tracks.find(t => t === trackId)) {
                return playlist;
            }

            // If the playlist is an automated playlist, check if the track is in the matched or included tracks
            if (playlist.filters !== undefined) {
                if ((playlist.matched_tracks.find(t => t === trackId) &&
                     !playlist.excluded_tracks.find(t => t === trackId)) ||
                    playlist.included_tracks.find(t => t === trackId)) {
                    return playlist;
                }
            }
        })
    }

    /**
     * Updates the tracks of a playlist
     * @param playlist Corresponding playlist
     * @param what What tracks should be updated.
     * @param removed What was changed in the track list
     */
    private async removeTracks(
        playlist: LoadedPlaylist,
        what: "matched" | "included" | "excluded",
        removed: string[],
    ) {
        // Save the playlist
        this.save(playlist)

        if (!this.unpublished) {
            // Do a call for every 500 tracks
            for (let i = 0; i < removed.length; i += 500) {
                await Fetch.delete(`server:/playlist/${playlist!.id}/${what}-tracks`, {
                    data: { removed: removed.slice(i, i + 500) }
                })
            }
        }
    }

    /**
     * Converts a raw track object from spotify to something we can use
     * @param track Track to convert
     */
    convertToCTrack(track :any) {
        return {
            id:             track.id,
            url:            track.external_urls.spotify,
            name:           track.name,
            popularity:     track.popularity,
            duration:       this.formatDuration(track.duration_ms),
            disc_number:    track.disc_number,
            track_number:   track.track_number,
            image:          Fetch.bestImage(track.album.images),
            artists:        track.artists.map((artist: CArtist) => { return {
                name: artist.name,
                id: artist.id,
            }}),
            album: {
                name: track.album.name,
                id: track.album.id
            } as any,
        } as CTrack
    }


    /**
     * Creates a copy of the playlist and converts it to a normal playlist
     * @param playlist playlist
     */
    convertToCPlaylist(playlist: LoadedPlaylist): CPlaylist {
        let splaylist = this.copy(playlist)
        // Remove the index
        delete splaylist.index

        const cplaylist = splaylist as unknown as CPlaylist
        cplaylist.owner = playlist.owner
        cplaylist.all_tracks = this.getTrackIds(playlist.all_tracks)
        if (playlist.filters !== undefined) {
            cplaylist.matched_tracks = this.getTrackIds(playlist.matched_tracks)
            cplaylist.excluded_tracks = this.getTrackIds(playlist.excluded_tracks)
            cplaylist.included_tracks = this.getTrackIds(playlist.included_tracks)
        }

        return cplaylist
    }

    /**
     * Removes tracks from a list of tracks
     * @param tracks Tracks which to look in
     * @param remove Tracks to remove
     */
    filterOut(tracks: PartialTrackList, remove: PartialTrackList) {
        return tracks.filter(track => !remove.some(t => t === (track as string) || t === (track as CTrack).id))
    }

    /**
     * Gets the ids of the tracks in the partialTrackList
     * @param tracks Tracks to get the ids from
     */
    getTrackIds(tracks: PartialTrackList) {
        return tracks.map(track => (track as CTrack).id || (track as string))
    }

    /**
     * Returns the duration in a human readable format
     * @param duration Duration in milliseconds
     */
    formatDuration(duration: number){
        return `${Math.floor(duration / 60000)}:`+Math.floor((duration / 1000) % 60).toString().padStart(2, "0")
    }
}