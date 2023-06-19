import { Store, Pinia } from "pinia-class-component";

import User from "./user";
import Fetch from "./fetch";
import * as SPlaylist from "~/../backend/src/types/playlist";
import { CArtist } from "~/../backend/src/types/client";
import { CTrack } from "~/../backend/src/types/client";

interface Playlist extends SPlaylist.Playlist {
    owner: {
        id: string;
        display_name: string;
    }
}

interface SelectedPlaylist extends Playlist {
    index: number;

    matched_tracks: CTrack[];
    included_tracks: CTrack[];
    excluded_tracks: CTrack[];
}

@Store
export default class PlaylistStore extends Pinia {
    user!: User;

    playlists!: Playlist[];
    selectedPlaylist!: SelectedPlaylist;

    // If there are any smart playlists
    hasSmartPlaylists: boolean = false;
    // If the user already has a smart playlist which is not yet pushed. Stored here for components to access
    unpublishedSmartPlaylist: Playlist | null = null;

    constructor(user: User) {
        super();
        this.user = user;
    }

    /**
     * Loads all the playlists the user has
     */
    async loadUserPlaylists(){
        if (this.playlists)
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
        this.playlists = playlists.map(playlist => {
            const smartPlaylist = smart.find(smart => smart.id === playlist.id);
            if (smartPlaylist) {
                smartPlaylist.image = playlist.image;
                smartPlaylist.owner = playlist.owner;
            }
            return smartPlaylist || playlist;
        })

        // Save only the first 3
        this.playlists = this.playlists.slice(0, 3);
    }

    /**
     * Loads tracks from your library
     */
    async loadLibrary(){
        // Load the library tracks
        const matched_tracks: CTrack[] = [];
        (await Fetch.get(`spotify:/me/tracks`, {pagination: true})).data
        .forEach((track: any) => {
            matched_tracks.push(this.convertToCTrack(track))
        })

        // We load the rest of the content later
        this.selectedPlaylist = {
            name: "Library",
            image: "https://t.scdn.co/images/3099b3803ad9496896c43f22fe9be8c4.png",
            index: -1,
            matched_tracks,
            excluded_tracks: [],
            included_tracks: [],
        } as any;
    }

    /**
     * Loads a playlist by its ID
     * @param id ID of the playlist to load
     */
    async loadPlaylistByID(id: string){
        if (!this.playlists)
            await this.loadUserPlaylists();

        const index = this.playlists.findIndex(p => p.id === id);
        if (index === -1) return false;

        return await this.loadPlaylist(index);
    }

    /**
     * Saves the old selectedPlaylist and loads the requested playlist and sets it as the selectedPlaylist
     * @param index playlist to load
     */
    async loadPlaylist(index: number){
        // As we are probably loading another playlist, first save the old one
        if (this.selectedPlaylist !== undefined)
            this.playlists[this.selectedPlaylist.index] = this.convertToPlaylist(this.selectedPlaylist)

        // Ensure the playlist exists
        index = Math.max(0, Math.min(index, this.playlists.length - 1));

        // Get the tracks associated with the playlist
        this.selectedPlaylist = {
            ...this.copy(this.playlists[index]),
            index: index,
            matched_tracks: [],
            excluded_tracks: [],
            included_tracks: [],
            owner: { id: this.playlists[index].owner.id, display_name: this.playlists[index].owner.display_name }
        }
        await this.loadPlaylistTracks(this.playlists[index]);
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

            // Store the result
            this.selectedPlaylist.excluded_tracks = excluded;
            this.selectedPlaylist.included_tracks = included;
        }

        // Store the matched tracks
        this.selectedPlaylist.matched_tracks = matched;
    }

    /**
     * Creates a new smart playlist
     */
    async createSmartPlaylist() {
        // If the user already has a smart playlist, return it
        if (this.unpublishedSmartPlaylist)
            return this.unpublishedSmartPlaylist;

        const playlist = {
            id:       "unpublished",
            user_id:  this.user.info.id,
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
            owner: { id: this.user.info.id, display_name: this.user.info.name }
        } as Playlist;

        this.unpublishedSmartPlaylist = playlist;
        this.playlists.push(playlist);
        this.hasSmartPlaylists = true;
        await this.loadPlaylist(this.playlists.length - 1)
    }

    /**
     * Moves a track from excluded_tracks to matched_tracks
     * @param track Track to move
     */
    removeMatched(track: CTrack){
        // Remove the tracks from the from the origin
        this.selectedPlaylist.excluded_tracks = this.selectedPlaylist.excluded_tracks.filter(t => t.id !== track.id)

        // Add the tracks to the destination
        this.selectedPlaylist.matched_tracks.push(track);
        this.selectedPlaylist.matched_tracks.sort();

        // Let the server know the change
        this.removeTracks(this.selectedPlaylist, 'matched', [track.id])
    }


    /**
     * Moves a track from matched_tracks to excluded_tracks
     * @param track Track to move
     */
    removeExcluded(track: CTrack){
        // Remove the tracks from the from the origin
        this.selectedPlaylist.matched_tracks = this.selectedPlaylist.matched_tracks.filter(t => t.id !== track.id);

        // Add the tracks to the destination
        this.selectedPlaylist.excluded_tracks = this.selectedPlaylist.excluded_tracks.concat(track);
        this.selectedPlaylist.excluded_tracks.sort();

        // Let the server know the change
        this.removeTracks(this.selectedPlaylist, 'matched', [track.id])
    }

    /**
     * Moves a track from excluded_tracks to matched_tracks
     * @param track Track to move
     */
    removeIncluded(track: CTrack){
        // Remove the tracks from the from the origin
        this.selectedPlaylist.included_tracks = this.selectedPlaylist.included_tracks.filter(t => t.id !== track.id)

        // Let the server know the change
        this.removeTracks(this.selectedPlaylist, 'included', [track.id])
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
        this.playlists = this.playlists.filter(item => item.id !== playlist.id);

        // If there are more smart playlists
        this.hasSmartPlaylists = this.playlists.some(playlist => playlist.filters !== undefined);
    }

    /**
     * Saves a playlist to the this.playlists array
     * @param playlist Playlist to save
     */
    async save(playlist: SelectedPlaylist | Playlist) {
        // If it is the selectedplaylist, convert and save.
        if ((playlist as SelectedPlaylist).index !== undefined) {
            this.playlists[this.selectedPlaylist.index] = this.convertToPlaylist((playlist as SelectedPlaylist));
        } else {
            const index = this.playlists.findIndex(p => p.id === playlist.id)
            this.playlists[index] = (playlist as Playlist);
        }
    }

    async execute(playlist: SelectedPlaylist | Playlist){
        const response = await Fetch.patch(`server:/playlist/${playlist.id}`);
        if (response.status === 304) {
            return response.data.log as Playlist['log']
        } else if (response.status === 200) {
            this.save(response.data)

            // If it is the selected playlist, load the new tracks
            if (response.data.id === this.selectedPlaylist.id)
                this.loadPlaylistTracks(response.data)

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
            duration:       `${Math.floor(track.duration_ms / 60000)}:`+Math.floor((track.duration_ms / 1000) % 60).toString().padStart(2, "0"),
            disc_number:    track.disc_number,
            track_number:   track.track_number,
            image:          Fetch.bestArtwork(track.album.images),
            artists:        track.artists.map((artist: CArtist) => { return {
                name: artist.name,
                id: artist.id
            }}),
            album:          {
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
}