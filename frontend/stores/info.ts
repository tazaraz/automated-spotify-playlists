import { Store, Pinia } from "pinia-class-component";
import Fetch from "./fetch";

enum InfoItemType {
    tracks = 'tracks',
    albums = 'albums',
    artists = 'artists',
    playlists = 'playlists'
}

export interface SearchConfig {
    query: string;
    track: boolean;
    album: boolean;
    artist: boolean;
    playlist: boolean;

    is_advanced: boolean;
    advanced?: {
        tracks: string[];
        albums: string[];
        artists: string[];
        year: string;
        tag_new: boolean;
        tag_hipster: boolean;
    }
}

export interface InfoItem {
    id: string;
    name: string;
    image?: string;
    description?: InfoItem[];
}

@Store
/**
 * The search store
 */
export default class Info extends Pinia {
    config: SearchConfig = null as any;

    searchResult: {[key in InfoItemType]: InfoItem[] | null} = {
        tracks: null,
        albums: null,
        artists: null,
        playlists: null
    };

    constructor() {
        super();
        if (!process.client) return;
        // Get the persistent search config
        this.config = JSON.parse(localStorage.getItem('sc') || 'null');
    }

    async search() {
        // Stop if no config is set
        if (this.config == null) return
        let query = "";
        const original_query = this.config.query;

        if (this.config.is_advanced) {
            query += this.config.advanced?.tracks ? this.config.advanced.tracks.map(t => ` track:${t}`) : '';
            query += this.config.advanced?.albums ? this.config.advanced.albums.map(t => ` album:${t}`) : '';
            query += this.config.advanced?.artists ? this.config.advanced.artists.map(t => ` artist:${t}`) : '';
            query += this.config.advanced?.year ? ` year:${this.config.advanced.year}` : '';
            query += this.config.advanced?.tag_new ? ` tag:new` : '';
            query += this.config.advanced?.tag_hipster ? ` tag:hipster` : '';
        }

        let type: string[] = [];
        let searchResult: typeof this.searchResult = { tracks: null, albums: null, artists: null, playlists: null };

        if (this.config.track)    { type.push('track');    searchResult.tracks = [];    }
        if (this.config.album)    { type.push('album');    searchResult.albums = [];    }
        if (this.config.artist)   { type.push('artist');   searchResult.artists = [];   }
        if (this.config.playlist) { type.push('playlist'); searchResult.playlists = []; }

        const response = await Fetch.get<{[key in InfoItemType]: any}>(`spotify:/search`, { query: {
            q: this.config.query + query,
            type: [
                this.config.track ? 'track' : '',
                this.config.album ? 'album' : '',
                this.config.artist ? 'artist' : '',
                this.config.playlist ? 'playlist' : ''
            ].filter(Boolean).join(','),
            limit: this.config.track || this.config.album ? '12' : '6',
        }});

        // If the query has changed, stop
        if (original_query !== this.config.query) return;

        if (response.status !== 200)
            return { error: response.statusText };

        // For every type requested
        for (const kind of Object.keys(response.data) as InfoItemType[]) {
            // For all searchResult of that type
            const items = Fetch.format(response.data[kind]);

            for (const item of items)
                searchResult[kind]!.push(this.parseSearchItem(item, kind));
        }

        // Limit the amount of items in each result
        searchResult[InfoItemType.artists] = searchResult[InfoItemType.artists]?.slice(0, 6) || null;
        searchResult[InfoItemType.playlists] = searchResult[InfoItemType.playlists]?.slice(0, 6) || null;
        searchResult[InfoItemType.tracks] = searchResult[InfoItemType.tracks]?.slice(0, 6) || null;
        searchResult[InfoItemType.albums] = searchResult[InfoItemType.albums]?.slice(0, 6) || null;

        this.searchResult = searchResult;
    }

    private parseSearchItem(item: any, kind: InfoItemType): InfoItem {
        // Store the result accordingly
        switch (kind) {
            case InfoItemType.tracks:
                return {
                    id: item.id,
                    name: item.name,
                    image: Fetch.bestImage(item.album!.images),
                    description: item.artists.map(artist => ({
                        id: artist.id,
                        name: artist.name
                    }))
                }
            case InfoItemType.albums:
                return {
                    id: item.id,
                    name: item.name,
                    image: Fetch.bestImage(item.images),
                    description: item.artists.map(artist => ({
                        id: artist.id,
                        name: artist.name
                    }))
                }
            case InfoItemType.artists:
                return {
                    id: item.id,
                    name: item.name,
                    image: Fetch.bestImage(item.images),
                    description: [{
                        id: '',
                        name: item.genres.join(', ')
                    }]
                }
            case InfoItemType.playlists:
                return {
                    id: item.id,
                    name: item.name,
                    image: Fetch.bestImage(item.images),
                    description: [{
                        id: item.owner.id,
                        name: item.owner.display_name,
                        description: item.description,
                    }],
                }
        }
    }

    /**
     * Save the search config to local storage
     * @param config The search config to save
     */
    storeSearchConfig(config: SearchConfig) {
        this.config = config;
        localStorage.setItem('sc', JSON.stringify(config));
    }
}