import { Store, Pinia } from "pinia-class-component";

import User from "./user";
import Fetch from "./fetch";
import { CTrack, CArtist, CPlaylist } from "~/../backend/src/types/client";
import FetchError from "./error";

export type { CPlaylist };

export interface LoadedPlaylist extends CPlaylist {
    index: number;
    ownership: "user" | "following" | "none";

    all_tracks: CTrack[];
    matched_tracks: CTrack[];
    included_tracks: CTrack[];
    excluded_tracks: CTrack[];
}

@Store
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

        const tracks = await this.loadPlaylistTracks(playlist);

        // Set the editing playlist
        this.editing = {
            ...playlist,
            index: this.storage.findIndex(p => p.id === id),
            ownership: this.playlistOwnership(playlist),
            all_tracks: tracks.all,
            matched_tracks: tracks.matched,
            included_tracks: tracks.included,
            excluded_tracks: tracks.excluded,
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
        const all_tracks: CTrack[] = [];
        (await Fetch.get(`spotify:/me/tracks`, {pagination: true})).data
        .forEach((track: any) => {
            all_tracks.push(this.convertToCTrack(track))
        })

        // We load the rest of the content later
        this.loaded.all_tracks = all_tracks as any;
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
        } as any as LoadedPlaylist

        // Ensure the playlist exists
        index = Math.max(0, Math.min(index, this.storage.length - 1));
        // Load the tracks
        const tracks = await this.loadPlaylistTracks(this.storage[index]);

        // If the loading playlist ID changed, we are loading another playlist, so dont save
        if (this.loadingPlaylistID !== id) return true;
        this.loadingPlaylistID = "";

        // Get the tracks associated with the playlist
        this.loaded = {
            ...this.copy(this.storage[index]),
            index: index,
            ownership: this.loaded.ownership,
            all_tracks: tracks.all,
            matched_tracks: tracks.matched,
            excluded_tracks: tracks.excluded,
            included_tracks: tracks.included,
            owner: { id: this.storage[index].owner.id, display_name: this.storage[index].owner.display_name }
        } as any as LoadedPlaylist;

        return true;
    }

    /**
     * Loads tracks from a playlist, or editingPlaylist if url is none.
     * If a playlist is specified, the tracks will be sorted into matched, excluded and included
     * @param url Url from which to receive tracks
     * @param playlist Optional smart playlist to sort the tracks into matched, excluded and included
     */
    async loadPlaylistTracks(playlist: CPlaylist) {
        let all: CTrack[] = [];
        let matched: CTrack[] = [];
        let included: CTrack[] = []
        let excluded: CTrack[] = [];

        if (playlist.id === "unpublished")
            return { all, matched, included, excluded };

        // Get the matched (and included as spotify does not know the difference) tracks from spotify
        const url = `/playlists/${playlist.id}/tracks`;
        (await Fetch.get(`spotify:${url}`, {pagination: true})).data
        .forEach((track: any) => {
            all.push(this.convertToCTrack(track))
        })

        // Get the excluded tracks from spotify
        if (playlist.excluded_tracks) {
            (await Fetch.get('spotify:/tracks', {ids: playlist.excluded_tracks})).data
            .forEach((track: any) => {
                excluded.push(this.convertToCTrack(track))
            })

            // Get the included tracks from the matched tracks retrieved from spotify
            included = all.filter(mt => playlist.included_tracks.includes(mt.id));

            // Remove the excluded and included tracks from the matched tracks
            matched = all.filter(mt => playlist.matched_tracks.includes(mt.id));
        }

        return { all, matched, excluded, included }
    }

    /**
     * Creates a new smart playlist
     */
    async createSmartPlaylist() {
        // If the user already has a smart playlist, return it
        if (this.unpublished)
            return this.storage.findIndex(p => p.id === this.unpublished!.id);

        const playlist = {
            id:       "unpublished",
            user_id:  this.user.info!.id,
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
            owner: { id: this.user.info!.id, display_name: this.user.info!.name, country: this.user.info!.country }
        } as CPlaylist;

        this.unpublished = playlist;
        this.hasSmartPlaylists = true;
        return this.storage.push(playlist) - 1;
    }

    /**
     * Moves a track from matched_tracks to excluded_tracks
     * @param track Track to move
     */
    removeMatched(track: CTrack){
        // Remove the tracks from the from the origin
        this.loaded.matched_tracks = this.loaded.matched_tracks.filter(t => t.id !== track.id);
        this.loaded.all_tracks     = this.loaded.all_tracks.filter(t => t.id !== track.id);

        // Add the tracks to the destination
        this.loaded.excluded_tracks = this.loaded.excluded_tracks.concat(track);
        this.loaded.excluded_tracks.sort();

        // Let the server know the change
        this.removeTracks(this.loaded, 'matched', [track.id])
    }

    /**
     * Moves a track from excluded_tracks to matched_tracks
     * @param track Track to move
     */
    removeExcluded(track: CTrack){
        // Remove the tracks from the from the origin
        this.loaded.excluded_tracks = this.loaded.excluded_tracks.filter(t => t.id !== track.id)

        // Add the tracks to the destination
        this.loaded.matched_tracks.push(track);
        this.loaded.matched_tracks.sort();
        this.loaded.all_tracks.push(track);
        this.loaded.all_tracks.sort();

        // Let the server know the change
        this.removeTracks(this.loaded, 'excluded', [track.id])
    }

    /**
     * Moves a track from excluded_tracks to matched_tracks
     * @param track Track to move
     */
    removeIncluded(track: CTrack){
        // Remove the tracks from the from the origin
        this.loaded.included_tracks = this.loaded.included_tracks.filter(t => t.id !== track.id)
        this.loaded.all_tracks      = this.loaded.all_tracks.filter(t => t.id !== track.id)

        // Let the server know the change
        this.removeTracks(this.loaded, 'included', [track.id])
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
        console.log(playlist)
        const response = await Fetch.patch(`server:/playlist/${playlist.id}`);
        if (response.status === 304) {
            return response.data.log as CPlaylist['log']
        } else if (response.status === 200) {
            this.save(response.data)

            // If it is the editing playlist, load the new tracks
            if (response.data.id === this.editing.id) {
                const tracks = await this.loadPlaylistTracks(response.data)
                this.editing.matched_tracks = tracks.matched;
                this.editing.excluded_tracks = tracks.excluded;
                this.editing.included_tracks = tracks.included;
            }

            return true;
        }
        return false;
    }

    /**
     * Updates a playlist server-side and executes the given filters
     * @param playlist Playlist to be updated server-side
     */
    async syncPlaylist(playlist: LoadedPlaylist | CPlaylist) {
        console.log(playlist)
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
    playlistOwnership(playlist: LoadedPlaylist): LoadedPlaylist['ownership'] {
        const user = this.storage.find(p => p.id === playlist.id) !== undefined;
        const owner = playlist.owner.id === this.user.info!.id;
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
        cplaylist.all_tracks = playlist.all_tracks.map(track => track.id)
        if (playlist.filters !== undefined) {
            cplaylist.matched_tracks = playlist.matched_tracks.map(track => track.id)
            cplaylist.excluded_tracks = playlist.excluded_tracks.map(track => track.id)
            cplaylist.included_tracks = playlist.included_tracks.map(track => track.id)
        }

        return cplaylist
    }

    formatDuration(duration: number){
        return `${Math.floor(duration / 60000)}:`+Math.floor((duration / 1000) % 60).toString().padStart(2, "0")
    }
}