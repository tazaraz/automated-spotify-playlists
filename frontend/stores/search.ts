import { Store, Pinia } from "pinia-class-component";
import Fetch from "~/composables/fetch";

/** What kind of items Spotify returns */
enum SearchItemType {
    track = 'track',
    album = 'album',
    artist = 'artist',
    playlist = 'playlist',
}

/** What kind of filters are applicable to the query */
enum SearchFilter {
    track = 'track',
    album = 'album',
    artist = 'artist',
    playlist = 'playlist',
    year = 'year',
    genre = 'genre',

}

interface SearchItem {
    id: string;
    name: string;
    image?: string;
    description?: SearchItem[];
}

@Store
/**
 * The search store
 */
export default class Searcher extends Pinia {
    query: string = '';

    /** What kind of filters are applicable to the query */
    filters = Object.values(SearchFilter);

    /** The search config */
    result: {[key in SearchItemType]: SearchItem[] | null} = { track: null, album: null, artist: null, playlist: null };

    constructor() {
        super();
        // Get the persistent search config
        this.search = JSON.parse(localStorage.getItem('q') || 'null');
    }

    async search(query: string) {
        // Save the query
        this.query = query;

        // Clear the previous search
        for (const kind of Object.keys(this.result) as SearchItemType[])
            this.result[SearchItemType[kind]] = [];

        const response = await Fetch.get<{[key in SearchItemType]: any}>(`spotify:/search`, { query: {
            q: query,
            type: Object.values(SearchItemType).join(','),
        }});

        // If the query has changed, stop (e.g. user has typed more)
        if (query !== this.query) return;

        if (response.status !== 200)
            return { error: response.statusText };

        // For every type requested
        for (const kind of Object.values(SearchItemType)) {
            // For all searchResult of that type
            const items = Fetch.format(response.data[`${kind}s` as SearchItemType]);

            for (const item of items) {
                if (!this.result[kind]) this.result[kind] = [];
                this.result[kind].push(this.parseSearchItem(item, kind));
            }

            // Limit the amount of items in each result
            if (this.result[kind])
                this.result[kind] = this.result[kind]?.slice(0, 6);
        }
    }

    private parseSearchItem(item: any, kind: SearchItemType): SearchItem {
        // Store the result accordingly
        switch (kind) {
            case SearchItemType.track:
                return {
                    id: item.id,
                    name: item.name,
                    image: Fetch.bestImage(item.album!.images),
                    description: item.artists.map((artist: any) => ({
                        id: artist.id,
                        name: artist.name
                    }))
                }
            case SearchItemType.album:
                return {
                    id: item.id,
                    name: item.name,
                    image: Fetch.bestImage(item.images),
                    description: item.artists.map((artist: any) => ({
                        id: artist.id,
                        name: artist.name
                    }))
                }
            case SearchItemType.artist:
                return {
                    id: item.id,
                    name: item.name,
                    image: Fetch.bestImage(item.images),
                    description: [{
                        id: '',
                        name: item.genres.join(', ')
                    }]
                }
            case SearchItemType.playlist:
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

    reset() {
        this.query = '';

        // Clear the previous search
        for (const kind of Object.keys(this.result) as SearchItemType[])
            this.result[SearchItemType[kind]] = null;
    }
}