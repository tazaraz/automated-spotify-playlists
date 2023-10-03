import { Store, Pinia } from "pinia-class-component";

import User from "./user";
import Fetch from "./fetch";
import { CTrack, CArtist, CPlaylist } from "~/../backend/src/shared/types/client";
import FetchError from "./error";

export type { CPlaylist };

/**
 * Contains ids beloning to tracks (unloaded), or tracks themselves (loaded)
 */
type partialTrackList = (CTrack | string)[];

export interface LoadedPlaylist extends CPlaylist {
    index: number;
    ownership: "user" | "following" | "none";

    /** Contains matched and included tracks */
    all_tracks: partialTrackList;
    /** Tracks which matched the filter */
    matched_tracks: partialTrackList;
    /** Tracks which were manually excluded by the user */
    excluded_tracks: partialTrackList;
    /** Tracks which were manually included by the user */
    included_tracks: partialTrackList;
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
    /** The smart playlist the user is currently editing */
    editing!: LoadedPlaylist;
    /** If the user already has a smart playlist which is not yet pushed. Stored here for components to access */
    unpublished: CPlaylist | null = null;

    // If there are any smart playlists
    hasSmartPlaylists: boolean = false;

    private loadingUserPlaylists: boolean | Promise<any> = false;
    // Whether all the playlist have their track ids loaded
    private loadingPlaylistsTrackIds: boolean | Promise<any> = false;
    // What playlist is currently being loaded
    private loadingPlaylistID: string = "";

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

            // Get smart playlists
            const res_s = await Fetch.get<CPlaylist[]>('server:/playlists');
            if (res_s.status !== 200) {
                FetchError.create({ status: res_s.status, message: 'The server did not respond accordingly when retrieving your smart playlists' });
                return resolve(false);
            }

            if (res_s.data.length > 0) this.hasSmartPlaylists = true;

            /**Overwrite the playlists with the smart playlists
             * NOTE: Not all playlists are actually smart playlists, but for typing we treat them as if
             *       Hence we check everywhere there is a distinction */
            this.storage = playlists.map(playlist => {
                const smartPlaylist = res_s.data.find(smart => smart.id === playlist.id);
                if (smartPlaylist) {
                    // Set some basic stuff
                    smartPlaylist.image = playlist.image;
                    smartPlaylist.owner = playlist.owner;
                    // Keep this one present as well
                    smartPlaylist.all_tracks = Array(playlist.all_tracks.length).fill("");
                }

                return smartPlaylist || playlist;
            });

            resolve({ status: 200 });
        })

        return await this.loadingUserPlaylists;
    }

    /**
     * Loads the requested playlist and sets it as the editingPlaylist
     * @param id ID of the playlist to load
     */
    async loadEditingPlaylist(id: string){
        // Load the playlist
        const playlist = this.storage.find(p => p.id === id);
        if (!playlist) return false;

        // Set the editing playlist
        this.editing = {
            ...playlist,
            index: this.storage.findIndex(p => p.id === id),
            ownership: this.playlistOwnership(playlist),
            // It's not visibile anyways
            all_tracks: [],
            matched_tracks: [],
            included_tracks: [],
            excluded_tracks: [],
        }
    }

    /**
     * Loads tracks from your library
     */
    async loadUserLibrary(){
        if (!this.storage)
            await this.loadUserPlaylists();

        // We load the rest of the content later
        this.loaded = {
            id: "library",
            name: "Library",
            image: "https://t.scdn.co/images/3099b3803ad9496896c43f22fe9be8c4.png",
            index: -1,
            ownership: "user",
            owner: { id: this.user.info!.id, display_name: this.user.info!.name },
        } as any as LoadedPlaylist;

        // Load the library tracks
        const library = (await Fetch.get(`spotify:/me/tracks?limit=50`)).data
        const all_tracks = Array(library.total).fill("")
              all_tracks.splice(0, 50, ...Fetch.format(library).map((track: any) => this.convertToCTrack(track)))

        // We load the rest of the content later
        this.loaded.all_tracks = all_tracks;
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
    async loadPlaylistTracks(kind: "all" | "matched" | "excluded" | "included" = "all",
                             offset: number = 0,
                             limit: number = 50) {
        let all: partialTrackList      = this.loaded.all_tracks || [];
        let matched: partialTrackList  = this.loaded.matched_tracks || [];
        let excluded: partialTrackList = this.loaded.excluded_tracks || [];
        let included: partialTrackList = this.loaded.included_tracks || [];

        if (this.loaded.id === "unpublished")
            return { all, matched, included, excluded };

        /** If it is not a smart playlist, use the Spotify playlist endpoint */
        if (kind == 'all' || this.loaded.filters === undefined) {
            const url = this.loaded.id == 'library' ? '/me/tracks' : `/playlists/${this.loaded.id}/tracks`;

            // Check if the offset is already loaded
            if ((all[offset] as CTrack)?.id === undefined) {
                let tracks = (await Fetch.get<any[]>(`spotify:${url}`, { offset })).data
                             .map((track: any) => this.convertToCTrack(track))

                // Insert the tracks into the all_tracks at the offset
                all.splice(offset, limit, ...tracks);

                // Check if the playlist is a smart playlist. If so update the other track lists as well
                if (this.loaded.filters !== undefined) {
                    // For all track lists, replace the ids with the tracks
                    for (const target of [all, matched, excluded, included]) {
                        for (const track of tracks) {
                            const index = target.findIndex(t => t === track.id);
                            if (index !== -1) target[index] = track;
                        }
                    }
                }
            }
        } else {
            /** The all, matched, excluded and included tracks include either the ids or the tracks themselves
             * We do not need to load the already loaded tracks again */
            let target = kind === "matched" ? matched :
                         kind === "excluded" ? excluded : included;

            // Get all tracks from [offset: offset + limit] which are still a string (their id only and thus not loaded)
            const missing = target.slice(offset, offset + limit).filter(track => typeof track === "string") as string[];
            if (missing.length > 0) {
                // Get the missing tracks from spotify
                let tracks = (await Fetch.get<any[]>('spotify:/tracks', { ids: missing })).data
                             .map((track: any) => this.convertToCTrack(track))

                // For all track lists, replace the ids with the tracks
                for (target of [all, matched, excluded, included]) {
                    for (const track of tracks) {
                        const index = target.findIndex(t => t === track.id);
                        if (index !== -1) target[index] = track;
                    }
                }
            }
        }

        return { all, matched, excluded, included }
    }

    /**
     * Builds a new smart playlist
     */
    buildSmartPlaylist(user: User['info']) {
        return {
            id:       "unpublished",
            user_id:  user!.id,
            name:     "Smart Playlist",
            description: '',
            image: '',
            track_sources: [{origin: "Library", value: ""}],
            filters: {
                mode: "all",
                filters: []
            },
            all_tracks: [],
            matched_tracks: [],
            excluded_tracks: [],
            included_tracks: [],
            log: { sources: [], filters: []},
            owner: { id: user!.id, display_name: user!.name, country: user!.country }
        } as CPlaylist;
    }

    /**
     * Adds a new smart playlist to the storage array
     */
    addSmartPlaylist() {
        // If the user already has a smart playlist, return it
        if (this.unpublished)
            return this.storage.findIndex(p => p.id === this.unpublished!.id);

        const playlist = this.buildSmartPlaylist(this.user.info);

        this.unpublished = playlist;
        this.hasSmartPlaylists = true;
        return this.storage.push(playlist) - 1;
    }

    /**
     * Moves tracks from matched_tracks to excluded_tracks
     * @param tracks Track to move
     */
    removeMatched(tracks: partialTrackList){
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
    removeExcluded(tracks: partialTrackList){
        // Remove the tracks from the from the origin
        this.loaded.excluded_tracks = this.filterOut(this.loaded.excluded_tracks, tracks);

        // Add the tracks to the destination
        this.loaded.matched_tracks.push(...tracks);
        this.loaded.matched_tracks.sort();
        this.loaded.all_tracks.push(...tracks);
        this.loaded.all_tracks.sort();

        // Let the server know the change
        this.removeTracks(this.loaded, 'excluded', tracks.map(t => (t as CTrack).id || (t as string)))
    }

    /**
     * Moves tracks from excluded_tracks to matched_tracks
     * @param tracks Tracks to move
     */
    removeIncluded(tracks: partialTrackList){
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
     * Deletes a playlist on the server if smart and unfollows it on Spotify
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
        }

        // Remove the playlist from the list
        this.storage = this.storage.filter(item => item.id !== playlist.id);

        // If there are more smart playlists
        this.hasSmartPlaylists = this.storage.some(playlist => playlist.filters !== undefined);
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

    /**
     * Executes the filters of a playlist
     * @param playlist Playlist filters to run
     */
    async execute(playlist: LoadedPlaylist | CPlaylist){
        const response = await Fetch.patch(`server:/playlist/${playlist.id}`, { retries: 0 });
        if (response.status === 302) {
            this.editing.log = response.data.log;
            return true;
        } else if (response.status === 200) {
            // Store the log
            this.editing.log = response.data.log;

            const all_tracks_length = response.data.matched_tracks.length + response.data.included_tracks.length - response.data.excluded_tracks.length;

            // Calculate the length of all_tracks
            response.data.all_tracks = Array(all_tracks_length).fill("");
            response.data.owner = playlist.owner
            this.save(response.data)

            // If it is the loaded playlist, load the new tracks
            if (response.data.id === this.loaded.id) {
                if (!await this.loadUserPlaylistByID(this.loaded.id)) {
                    FetchError.create({ status: 500, message: "The playlist you just executed does not exist. Even though the shown playlist does. Which must be yours given you just executed its filters. Weird." });
                    return false;
                }

                // Don't hang the page while loading
                this.loadPlaylistTracks().then(tracks => {
                    this.loaded.all_tracks = tracks.all;
                    this.loaded.matched_tracks = tracks.matched;
                    this.loaded.excluded_tracks = tracks.excluded;
                    this.loaded.included_tracks = tracks.included;
                })
            }

            return false;
        }

        return false;
    }

    /**
     * Updates a playlist server-side and executes the given filters
     * @param playlist Playlist to be updated server-side
     */
    async syncPlaylist(playlist: LoadedPlaylist | CPlaylist) {
        let response = await Fetch.put("server:/playlist", {
            headers: { 'Content-Type': 'json' },
            data: {
                id: playlist.id,
                user_id: playlist.user_id,
                name: playlist.name,
                description: playlist.description ?? "",
                filters: playlist.filters,
                track_sources: playlist.track_sources,
            }
        })

        return response.data as string
    }

    /**
     * Updates the basic information of a playlist
     * @param playlist Playlist to sync
     */
    async updateBasic(playlist: LoadedPlaylist) {
        if (!this.unpublished) {
            this.save(playlist)

            await Fetch.put(`server:/playlist/${playlist.id}/basic`, { data: {
                name: playlist.name,
                description: playlist.description
            }})
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
     * @Param trackId The id of the track
     */
    async trackAppearsIn(trackId: string){
        if (!this.loadingPlaylistsTrackIds || this.storage[0].all_tracks === undefined) {
            // Try to get all the track ids for each playlist
            this.loadingPlaylistsTrackIds = Promise.all(this.storage.map(async (playlist, index) => {
                // If the playlist is not a smart playlist, we need to load the track ids
                if (playlist.filters === undefined) {
                    const tracks = (await Fetch.get<any[]>(`spotify:/playlists/${playlist.id}/tracks`, {pagination: true})).data;
                    this.storage[index].all_tracks = tracks.map(track => track.id);
                }
            }))

            // Wait to complete
            await this.loadingPlaylistsTrackIds;
            this.loadingPlaylistsTrackIds = true;
        }

        // Wait for the track ids to be loaded
        await this.loadingPlaylistsTrackIds;

        // Return the playlists in which the track appears
        return this.storage.filter(playlist => {
            if (playlist.all_tracks.find(t => t === trackId)) {
                return playlist;
            }
        })
    }

    /**
     * Updates the tracks of a playlist
     * @param playlist Corresponding playlist
     * @param what What tracks should be updated
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
            await Fetch.delete(`server:/playlist/${playlist!.id}/${what}-tracks`, { data: { removed: removed } })
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
    filterOut(tracks: partialTrackList, remove: partialTrackList) {
        return tracks.filter(track => !remove.some(t => t === (track as string) || t === (track as CTrack).id))
    }

    /**
     * Gets the ids of the tracks in the partialTrackList
     * @param tracks Tracks to get the ids from
     */
    getTrackIds(tracks: partialTrackList) {
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