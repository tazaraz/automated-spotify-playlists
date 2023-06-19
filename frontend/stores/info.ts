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

interface InfoItem {
    id: string;
    name: string;
    image?: string;
    description?: InfoItem[];
}

@Store
export default class Info extends Pinia {
    currentItem: InfoItem | null = null;
    searchConfig: SearchConfig | null = null;

    searchResult: {[key in InfoItemType]: InfoItem[]} = {
        tracks: [],
        albums: [],
        artists: [],
        playlists: []
    };

    constructor() {
        super();
        if (!process.client) return;
        // Get the persistent search config
        this.searchConfig = JSON.parse(localStorage.getItem('sc') || 'null');
    }

    setCurrenItem(item: any, type: InfoItemType) {
        this.currentItem = this.parseItem(item, type);
    }

    async search(config: SearchConfig) {
        let query = config.query;

        if (config.is_advanced) {
            query += config.advanced?.tracks ? config.advanced.tracks.map(t => ` track:${t}`) : '';
            query += config.advanced?.albums ? config.advanced.albums.map(t => ` album:${t}`) : '';
            query += config.advanced?.artists ? config.advanced.artists.map(t => ` artist:${t}`) : '';
            query += config.advanced?.year ? ` year:${config.advanced.year}` : '';
            query += config.advanced?.tag_new ? ` tag:new` : '';
            query += config.advanced?.tag_hipster ? ` tag:hipster` : '';
        }

        const response = await Fetch.get<{[key in InfoItemType]: any}>(`spotify:/search`, { query: {
            q: query,
            type: [
                config.track ? 'track' : '',
                config.album ? 'album' : '',
                config.artist ? 'artist' : '',
                config.playlist ? 'playlist' : ''
            ].filter(Boolean).join(','),
            limit: config.track || config.album ? '10' : '5',
        }});

        if (response.status !== 200)
            return { error: response.statusText };

        // Clear the results
        this.searchResult = { tracks: [], albums: [], artists: [], playlists: [] };

        // Save the config
        this.searchConfig = config;
        localStorage.setItem('sc', JSON.stringify(config));

        // For every type requested
        for (const kind of Object.keys(response.data) as InfoItemType[]) {
            // For all searchResult of that type
            const items = Fetch.format(response.data[kind]);

            for (const item of items)
                this.searchResult[kind].push(this.parseItem(item, kind));
        }

        // Limit the amount of items in each result
        this.searchResult[InfoItemType.artists] = this.searchResult[InfoItemType.artists].slice(0, 5);
        this.searchResult[InfoItemType.playlists] = this.searchResult[InfoItemType.playlists].slice(0, 5);
        this.searchResult[InfoItemType.tracks] = this.searchResult[InfoItemType.tracks].slice(0, 10);
        this.searchResult[InfoItemType.albums] = this.searchResult[InfoItemType.albums].slice(0, 10);
    }

    parseItem(item: any, kind: InfoItemType): InfoItem {
        // Store the result accordingly
        switch (kind) {
            case InfoItemType.tracks:
                return {
                    id: item.id,
                    name: item.name,
                    image: Fetch.bestArtwork(item.album!.images),
                    description: item.artists.map(artist => ({
                        id: artist.id,
                        name: artist.name
                    }))
                }
                break;
            case InfoItemType.albums:
                return {
                    id: item.id,
                    name: item.name,
                    image: Fetch.bestArtwork(item.images),
                    description: item.artists.map(artist => ({
                        id: artist.id,
                        name: artist.name
                    }))
                }
                break;
            case InfoItemType.artists:
                // Limit the amount of genres to display
                const display = item.genres.slice(0, 3).join(', ').length > 27 ? 2 : 3;

                return {
                    id: item.id,
                    name: item.name,
                    image: Fetch.bestArtwork(item.images),
                    description: [{
                        id: '',
                        name: item.genres.slice(0, display).join(', ') + (item.genres.length > display ? ', ...' : '')
                    }]
                }
                break;
            case InfoItemType.playlists:
                return {
                    id: item.id,
                    name: item.name,
                    image: Fetch.bestArtwork(item.images),
                    description: [{
                        id: item.owner.id,
                        name: item.owner.display_name,
                        description: item.description,
                    }],

                }
                break;
        }
    }
}