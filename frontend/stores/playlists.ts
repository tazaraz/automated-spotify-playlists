import { Store, Pinia } from "pinia-class-component";

import User from "./user";
import Fetch from "./fetch";
import * as SPlaylist from "~/../backend/src/types/playlist";
import { CArtist } from "~/../backend/src/types/client";
import { CTrack } from "~/../backend/src/types/client";

export interface Playlist extends SPlaylist.Playlist {
    owner: {
        id: string;
        display_name: string;
    }
}

export interface SelectedPlaylist extends Playlist {
    index: number;

    matched_tracks: CTrack[];
    included_tracks: CTrack[];
    excluded_tracks: CTrack[];
}

@Store
export default class Playlists extends Pinia {
    user!: User;

    storage!: Playlist[];
    selected!: SelectedPlaylist;

    // If there are any smart playlists
    hasSmartPlaylists: boolean = false;
    // If the user already has a smart playlist which is not yet pushed. Stored here for components to access
    unpublishedSmartPlaylist: Playlist | null = null;

    // Whether all the playlist have their track ids loaded
    private loadedPlaylistsTrackIds: boolean | Promise<any> = false;

    setUser(user: User){
        this.user = user;
    }

    /**
     * Loads all the playlists the user has
     */
    async loadUserPlaylists(){
        if (this.storage !== undefined)
            return;

        let playlists: Playlist[] = [];

        // Get the user playlists from Spotify
        (await Fetch.get<any[]>('spotify:/me/playlists', {pagination: true}))
        .data.forEach(playlist => {
            playlists.push({
                id:         playlist.id,
                user_id:    playlist.owner.id,
                name:       playlist.name,
                description: playlist.description,
                image:      Fetch.bestArtwork(playlist.images),
                owner:      { id: playlist.owner.id, display_name: playlist.owner.display_name },
            } as Playlist)
        });

        // Get smart playlists
        const smart = (await Fetch.get<Playlist[]>('server:/playlists')).data;
        if (smart.length > 0) this.hasSmartPlaylists = true;

        /* Overwrite the playlists with the smart playlists
         * NOTE: Not all playlists are actually smart playlists, but for typing we treat them as if
         *       Hence we check everywhere there is a distinction */
        this.storage = playlists.map(playlist => {
            const smartPlaylist = smart.find(smart => smart.id === playlist.id);
            if (smartPlaylist) {
                // Set some basic stuff
                smartPlaylist.image = playlist.image;
                smartPlaylist.owner = playlist.owner;
            }
            return smartPlaylist || playlist;
        });
    }

    /**
     * Returns the playlists in which the track appears
     * @Param trackId The id of the track
     */
    async trackAppearsIn(trackId: string){
        if (!this.loadedPlaylistsTrackIds) {
            // Try to get all the track ids for each playlist
            this.loadedPlaylistsTrackIds = Promise.all(this.storage.map(async playlist => {
                // If the playlist is not a smart playlist, we need to load the track ids
                if (playlist.filters === undefined) {
                    const tracks = (await Fetch.get<any[]>(`spotify:/playlists/${playlist.id}/tracks`, {pagination: true})).data;
                    playlist.matched_tracks = tracks.map(track => track.id);
                }
            }))

            // Wait to complete
            await this.loadedPlaylistsTrackIds;
            this.loadedPlaylistsTrackIds = true;
        }

        // Wait for the track ids to be loaded
        await this.loadedPlaylistsTrackIds;

        // Return the playlists in which the track appears
        return this.storage.filter(playlist => {
            if (playlist.matched_tracks.find(t => t === trackId) ||
                playlist.included_tracks?.find(t => t === trackId)) {
                return playlist;
            }
        })
    }

    /**
     * Saves the old selectedPlaylist and loads the requested playlist and sets it as the selectedPlaylist
     * @param id ID of the playlist to load
     */
    async loadSelectedPlaylist(id: string){
        // As we are probably loading another playlist, first save the old one
        if (this.selected !== undefined)
            this.storage[this.selected.index] = this.convertToPlaylist(this.selected)

        // Load the playlist
        const playlist = await this.loadUserPlaylistByID(id);
        if (!playlist) return false;

        const tracks = await this.loadPlaylistTracks(playlist);

        // Set the selected playlist
        this.selected = {
            ...playlist,
            index: this.storage.findIndex(p => p.id === id),
            matched_tracks: tracks.matched,
            included_tracks: tracks.included,
            excluded_tracks: tracks.excluded,
        }
    }

    /**
     * Loads tracks from your library
     */
    async loadUserLibrary(){
        // Load the library tracks
        const matched_tracks: CTrack[] = [];
        (await Fetch.get(`spotify:/me/tracks`, {pagination: true})).data
        .forEach((track: any) => {
            matched_tracks.push(this.convertToCTrack(track))
        })

        // We load the rest of the content later
        return {
            name: "Library",
            image: "https://t.scdn.co/images/3099b3803ad9496896c43f22fe9be8c4.png",
            index: -1,
            matched_tracks,
        } as any as Playlist;
    }

    /**
     * Loads a playlist by its ID
     * @param id ID of the playlist to load
     */
    async loadUserPlaylistByID(id: string){
        if (!this.storage)
            await this.loadUserPlaylists();

        let index = this.storage.findIndex(p => p.id === id);
        if (index === -1) return false;

        // Ensure the playlist exists
        index = Math.max(0, Math.min(index, this.storage.length - 1));
        // Load the tracks
        const tracks = await this.loadPlaylistTracks(this.storage[index]);

        // Get the tracks associated with the playlist
        return {
            ...this.copy(this.storage[index]),
            index: index,
            matched_tracks: tracks.matched,
            excluded_tracks: tracks.excluded,
            included_tracks: tracks.included,
            owner: { id: this.storage[index].owner.id, display_name: this.storage[index].owner.display_name }
        } as any as Playlist;
    }

    /**
     * Loads tracks from a playlist, or selectedPlaylist if url is none.
     * If a playlist is specified, the tracks will be sorted into matched, excluded and included
     * @param url Url from which to receive tracks
     * @param playlist Optional smart playlist to sort the tracks into matched, excluded and included
     */
    async loadPlaylistTracks(playlist: Playlist){
        let matched: CTrack[] = [];
        let included: CTrack[] = []
        let excluded: CTrack[] = [];

        // Get the matched (and included as spotify does not know the difference) tracks from spotify
        const url = `/playlists/${playlist.id}/tracks`;
        (await Fetch.get(`spotify:${url}`, {pagination: true})).data
        .forEach((track: any) => {
            matched.push(this.convertToCTrack(track))
        })

        // Get the excluded tracks from spotify
        if (playlist.excluded_tracks) {
            (await Fetch.get('spotify:/tracks', {ids: playlist.excluded_tracks})).data
            .forEach((track: any) => {
                excluded.push(this.convertToCTrack(track))
            })

            // Get the included tracks from the matched tracks retrieved from spotify
            included = matched.filter(mt => playlist.included_tracks.includes(mt.id));

            // Remove the excluded and included tracks from the matched tracks
            matched = matched.filter(mt => !included.some(st => st.id === mt.id))
        }

        return { matched, excluded, included }
    }

    /**
     * Creates a new smart playlist
     */
    async createSmartPlaylist() {
        // If the user already has a smart playlist, return it
        if (this.unpublishedSmartPlaylist)
            return this.storage.findIndex(p => p.id === this.unpublishedSmartPlaylist!.id);

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
            matched_tracks: [],
            excluded_tracks: [],
            included_tracks: [],
            log: { sources: [], filters: []},
            owner: { id: this.user.info!.id, display_name: this.user.info!.name }
        } as Playlist;

        this.unpublishedSmartPlaylist = playlist;
        this.hasSmartPlaylists = true;
        return this.storage.push(playlist) - 1;
    }

    /**
     * Moves a track from excluded_tracks to matched_tracks
     * @param track Track to move
     */
    removeMatched(track: CTrack){
        // Remove the tracks from the from the origin
        this.selected.excluded_tracks = this.selected.excluded_tracks.filter(t => t.id !== track.id)

        // Add the tracks to the destination
        this.selected.matched_tracks.push(track);
        this.selected.matched_tracks.sort();

        // Let the server know the change
        this.removeTracks(this.selected, 'matched', [track.id])
    }


    /**
     * Moves a track from matched_tracks to excluded_tracks
     * @param track Track to move
     */
    removeExcluded(track: CTrack){
        // Remove the tracks from the from the origin
        this.selected.matched_tracks = this.selected.matched_tracks.filter(t => t.id !== track.id);

        // Add the tracks to the destination
        this.selected.excluded_tracks = this.selected.excluded_tracks.concat(track);
        this.selected.excluded_tracks.sort();

        // Let the server know the change
        this.removeTracks(this.selected, 'matched', [track.id])
    }

    /**
     * Moves a track from excluded_tracks to matched_tracks
     * @param track Track to move
     */
    removeIncluded(track: CTrack){
        // Remove the tracks from the from the origin
        this.selected.included_tracks = this.selected.included_tracks.filter(t => t.id !== track.id)

        // Let the server know the change
        this.removeTracks(this.selected, 'included', [track.id])
    }

    /**
     * Creates a complete memory copy of a playlist
     * @param playlist playlist to duplicate
     */
    copy<T>(playlist: T): T {
        return JSON.parse(JSON.stringify(playlist));
    }

    /**
     * Deletes a playlist
     * @param playlist Playlist to delete
     */
    async delete(playlist: SelectedPlaylist | Playlist) {
        if (!this.unpublishedSmartPlaylist)
            await Fetch.delete("server:/playlist", { data: { id: playlist.id } })

        // Remove the playlist from the list
        this.storage = this.storage.filter(item => item.id !== playlist.id);

        // If there are more smart playlists
        this.hasSmartPlaylists = this.storage.some(playlist => playlist.filters !== undefined);
    }

    /**
     * Saves a playlist to the this.storage array
     * @param playlist Playlist to save
     */
    async save(playlist: SelectedPlaylist | Playlist) {
        // If it is the selectedplaylist, convert and save.
        if ((playlist as SelectedPlaylist).index !== undefined) {
            this.storage[this.selected.index] = this.convertToPlaylist((playlist as SelectedPlaylist));
        } else {
            const index = this.storage.findIndex(p => p.id === playlist.id)
            this.storage[index] = (playlist as Playlist);
        }
    }

    async execute(playlist: SelectedPlaylist | Playlist){
        const response = await Fetch.patch(`server:/playlist/${playlist.id}`);
        if (response.status === 304) {
            return response.data.log as Playlist['log']
        } else if (response.status === 200) {
            this.save(response.data)

            // If it is the selected playlist, load the new tracks
            if (response.data.id === this.selected.id) {
                const tracks = await this.loadPlaylistTracks(response.data)
                this.selected.matched_tracks = tracks.matched;
                this.selected.excluded_tracks = tracks.excluded;
                this.selected.included_tracks = tracks.included;
            }

            return true;
        }
        return false;
    }

    /**
     * Updates a playlist server-side and executes the given filters
     * @param playlist Playlist to be updated server-side
     */
    async syncPlaylist(playlist: Playlist) {
        let response = await Fetch.put("server:/playlist", { data: {
            id: playlist.id,
            user_id: playlist.user_id,
            name: playlist.name,
            description: playlist.description ?? "",
            filters: playlist.filters,
            track_sources: playlist.track_sources,
        }})

        if (response.status === 400)
            return response.data;

        if (this.unpublishedSmartPlaylist) {
            this.unpublishedSmartPlaylist.id = response.data.id;
            this.unpublishedSmartPlaylist = null;
        }

        return response.data
    }

    /**
     * Updates the basic information of a playlist
     * @param playlist Playlist to sync
     */
    async updateBasic(playlist: SelectedPlaylist | Playlist) {
        if (!this.unpublishedSmartPlaylist) {
            this.save(playlist)

            await Fetch.put(`server:/playlist/${playlist.id}/basic`, { data: {
                name: playlist.name,
                description: playlist.description
            }})
        }
    }

    /**
     * Updates the tracks of a playlist
     * @param playlist Corresponding playlist
     * @param what What tracks should be updated
     * @param removed What was changed in the track list
     */
    async removeTracks(
        playlist: SelectedPlaylist | Playlist,
        what: "matched" | "included" | "excluded",
        removed: string[],
    ) {
        // Save the playlist
        this.save(playlist)

        if (!this.unpublishedSmartPlaylist) {
            await Fetch.delete(`server:/playlist/${playlist!.id}/${what}-tracks`, { data: { removed } })
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
            image:          Fetch.bestArtwork(track.album.images),
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
     * Creates a copy of the selectedPlaylist and converts it to a normal playlist
     * @param selectedPlaylist selectedPlaylist
     */
    convertToPlaylist(selectedPlaylist: SelectedPlaylist){
        let splaylist = this.copy(selectedPlaylist)
        // Remove the index
        delete splaylist.index

        const playlist = splaylist as unknown as Playlist
        playlist.matched_tracks = selectedPlaylist.matched_tracks.map(track => track.id)
        playlist.excluded_tracks = selectedPlaylist.excluded_tracks.map(track => track.id)
        playlist.included_tracks = selectedPlaylist.included_tracks.map(track => track.id)

        return playlist
    }

    formatDuration(duration: number){
        return `${Math.floor(duration / 60000)}:`+Math.floor((duration / 1000) % 60).toString().padStart(2, "0")
    }
}