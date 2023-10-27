import { THROW_DEBUG_ERROR } from "../main";
import Fetch, { FetchOptions } from "../tools/fetch";
import { SUser } from "../shared/types/server";
import { SAlbum, SArtist, STrack, STrackFeatures } from "../shared/types/server";

/**
 * This class creates a queue which is used to group up items if they are requested quickly after each other.
 * This fixes that if too many data with the same ID is requested, Spotify will randomly 404
 * And it is nice to merge requests to Spotify
 */
class Queue {
    // Queue storage
    queue: Set<string> = new Set();
    // Function to run after the delay has expired
    executor: Function;
    // Wait until this has resolved
    executed: Promise<boolean> = Promise.resolve(false);
    // If, while this.executor is running, wait until it is finished
    running: boolean | Promise<boolean> = false;
    // Delay before the executor is run
    delay = 2000;

    constructor(executor: Function) {
        this.executor = executor;
    }

    async add(item: string) {
        // Wait for the executor to finish if it is running
        await this.running;

        // If the queue is empty, we need to create a new one
        if (this.queue.size === 0) {
            this.executed = new Promise(resolve_executed => {
                // Create a delay before executing the queue
                setTimeout(() => {
                    // Do not add items to the queue while the executor is running
                    this.running = new Promise(async resolve_running => {
                        await this.executor([...this.queue]);
                        this.queue = new Set();
                        resolve_running(true);
                        resolve_executed(true);
                    });

                }, this.delay)
            })
        }

        // Add the item to the queue
        this.queue.add(item);

        // Wait for the queue to have executed
        await this.executed;

        return;
    }
}

export default class Metadata {
    /**Contains known track information */
    static tracks: { [id: string]: STrack } = {};
    static albums: { [id: string]: SAlbum } = {};
    static artists: { [id: string]: SArtist } = {};
    static track_features: { [id: string]: STrackFeatures } = {};

    static track_queue          = new Queue((items: string[]) => this.getMultipleTracks("/tracks", {
        user: Metadata.API_USER, ids: items
    }));
    static album_queue          = new Queue((items: string[]) => this.getMultipleAlbums("/albums", {
        user: Metadata.API_USER, ids: items, limit: 20
    }));
    static artist_queue         = new Queue((items: string[]) => this.getMultipleArtists("/artists", {
        user: Metadata.API_USER, ids: items
    }));
    static track_features_queue = new Queue((items: string[]) => this.getMultipleTrackFeatures("/audio-features", {
        user: Metadata.API_USER, ids: items
    }));

    /** This contains a user used for global API calls */
    static API_USER: SUser;

    /**The value of the url links to the yielded result of that url */
    static url_cache: {
        [url: string]: {
            expires: Date;
            items: string[];
        };
    } = {}

    /**Requests tied to a specific user */
    static user_cache: {
        [id: string]: {
            [url: string]: {
                expires: Date;
                items: string[];
            };
        };
    } = {};

    static initialize() {
        /**We define the getters and setters for the objects */
        Metadata.tracks = new Proxy(Metadata.tracks, {
            set: Metadata.setTrack,
            deleteProperty: Metadata.delete,
            has: Metadata.hasProperty
        })
        Metadata.albums = new Proxy(Metadata.albums, {
            set: Metadata.setAlbum,
            deleteProperty: Metadata.delete,
            has: Metadata.hasProperty
        })
        Metadata.artists = new Proxy(Metadata.artists, {
            set: Metadata.setArtist,
            deleteProperty: Metadata.delete,
            has: Metadata.hasProperty
        })
        Metadata.track_features = new Proxy(Metadata.track_features, {
            set: Metadata.setTrackFeatures,
            deleteProperty: Metadata.delete,
            has: Metadata.hasProperty
        })
    }

    /**
     * Gets a single item from Spotify
     * @param cache     The storage of the items
     * @param queue     The queue associated with the cache
     * @param id        The id of the item to get
     * @returns
     */
    private static async getItem<T>(
        cache: { [id: string]: T },
        queue: typeof Metadata.track_queue |
            typeof Metadata.album_queue |
            typeof Metadata.artist_queue |
            typeof Metadata.track_features_queue,
        id: string): Promise<T>
    {
        // If we already store this item, don't ask Spotify for the Metadata
        if (cache[id] !== undefined)
            return cache[id];

        // Get the Metadata
        await queue.add(id);

        // Return the value
        return cache[id];
    }

    static getTrack(track_id: string): Promise<STrack> {
        return Metadata.getItem(Metadata.tracks, Metadata.track_queue, track_id);
    }

    static getAlbum(album_id: string): Promise<SAlbum> {
        return Metadata.getItem(Metadata.albums, Metadata.album_queue, album_id);
    }

    static getArtist(artist_id: string): Promise<SArtist> {
        return Metadata.getItem(Metadata.artists, Metadata.artist_queue, artist_id);
    }

    static getTrackFeatures(track_id: string): Promise<STrackFeatures> {
        return Metadata.getItem(Metadata.track_features, Metadata.track_features_queue, track_id);
    }

    /**
     * Gets multiple items from Spotify
     * @param url               The url endpoint to get the items from
     * @param cache             Cache of the items
     * @param options           Extra options
     */
    private static async getMultiple<T>(
        url: string,
        cache: { [id: string]: T },
        options: FetchOptions = {},
    ): Promise<T[]> {
        // If we have already resolved this url once, use the result
        if (Metadata.url_cache[url] !== undefined && Metadata.url_cache[url].expires > new Date())
            return await Promise.all(Metadata.url_cache[url].items.map(id => cache[id]));

        // Make a note of which items we already have
        options.ids = options.ids ?? [];
        const missing_data_ids = options.ids.filter(x => x in cache === false);
        const present_data_ids = options.ids.filter(x => !missing_data_ids.includes(x));

        // Get the items requested in the track_ids, or just get all items from the url directly
        options.ids  = missing_data_ids;
        options.user = options.user ?? Metadata.API_USER;
        let request  = await Fetch.get<any[]>(url, options);

        if (request.status >= 300) {
            THROW_DEBUG_ERROR(`getMultiple: The endpoint '${url}' returned status code ${request.status}`);
            return [];
        }
        const data = request.data;

        // Get the already known tracks
        const items = present_data_ids.map(id => cache[id]);

        // Store the new items
        for (let item of data) {
            // Try setting the items. However, if the specified endpoint does not return all the missing_data_ids data,
            // the item will be fetched from the API
            try {
                cache[item.id] = item;
            } catch (error) {
                // Some attribute is missing, get the full item from the API
                switch(url) {
                    case "/tracks": Metadata.getTrack(item.id); break;
                    case "/albums": Metadata.getAlbum(item.id); break;
                    case "/artists": Metadata.getArtist(item.id); break;
                    case "/audio-features": Metadata.getTrackFeatures(item.id); break;
                    default:
                        THROW_DEBUG_ERROR(`getMultiple: The endpoint '${url}' returned incomplete data'`);
                }
            }

            items.push(cache[item.id]);
        }

        // If this was a custom url
        if (url != '/tracks' &&
            url != '/albums' &&
            url != '/artists' &&
            url != '/audio-features' &&
            url != '/recommendations' &&
            !url.startsWith('/me') &&
            !url.startsWith('/browse')
        ) {
            Metadata.url_cache[url] = {
                // Expire in a week
                expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
                items: items.map(item => (item as any).id)
            }
        }

        return await Promise.all(items);
    }

    static getMultipleTracks(url="/tracks", options: FetchOptions = {}): Promise<STrack[]> {
        return Metadata.getMultiple(url, Metadata.tracks, options);
    }

    static getMultipleAlbums(url="/albums", options: FetchOptions = {}): Promise<SAlbum[]> {
        return Metadata.getMultiple(url, Metadata.albums, options);
    }

    static getMultipleArtists(url="/artists", options: FetchOptions = {}): Promise<SArtist[]> {
        return Metadata.getMultiple(url, Metadata.artists, options);
    }

    static getMultipleTrackFeatures(url="/audio-features", options: FetchOptions = {}) {
        return Metadata.getMultiple(url, Metadata.track_features as any, options);
    }

    /**
     * Gets data specific to the user
     * @param user_id  The id of the user
     * @param url      The url on which to perform the request
     * @param kind     The kind of data to request. Leave out or specify "any" to do a direct request without any caches
     * @param expires  The time in seconds after which the cache expires
     * @param options  The options to pass to the request
     * @returns        The result of said request specific to the user
     */
    static async getUserData<T extends STrack | SAlbum | SArtist>(
        url: string,
        kind: "track" | "album" | "artist",
        expires: number,
        options: FetchOptions,
    ): Promise<T[]> {
        let items: any;

        // If the user is not yet defined, create the object
        if (Metadata.user_cache[options.user.id] == undefined)
            Metadata.user_cache[options.user.id] = {};

        // If this url is known for a specific user, use the cached data (if not expired)
        if (Metadata.user_cache[options.user.id][url]        != undefined &&
            Metadata.user_cache[options.user.id][url].expires <= new Date()) {
            switch (kind) {
                case "track":  items = Metadata.user_cache[options.user.id][url].items.map(id => Metadata.getTrack(id))
                case "album":  items = Metadata.user_cache[options.user.id][url].items.map(id => Metadata.getAlbum(id))
                case "artist": items = Metadata.user_cache[options.user.id][url].items.map(id => Metadata.getArtist(id))
            }

            return await Promise.all(items);
        }

        switch (kind) {
            case "track":
                items = await Metadata.getMultiple<STrack>(url, Metadata.tracks, options);
                break;
            case "album":
                items = await Metadata.getMultiple<SAlbum>(url, Metadata.albums, options);
                break;
            case "artist":
                items = await Metadata.getMultiple<SArtist>(url, Metadata.artists, options);
                break;
        }

        Metadata.user_cache[options.user.id][url] = {
            expires: new Date(new Date().getTime() + expires * 1000),
            items: items.map(item => item.id),
        }

        return items as T[];
    }

    private static delete(target: { [id: string]: any }, prop: string){
        delete target[prop];
        return true;
    }

    private static hasProperty(target: { [id: string]: any }, prop: string) {
        return prop in target;
    }

    /**
     * Creates a track and its getters and setters based on given data
     * @param data Metadata from which to create a track
     * @returns Returns a pointer to the newly created track
     */
    private static setTrack(tracks: typeof Metadata.tracks, key: string, data: any) {
        tracks[key] = {
            disc_number: data.disc_number,
            track_number: data.track_number,
            duration_ms: data.duration_ms,
            url: "http://open.spotify.com/track/" + data.id,
            id: data.id,
            name: data.name,
            popularity: data.popularity,
            is_local: data.is_local || false,
            album: () => Metadata.getAlbum(data.album.id),
            artists: () => Promise.all(data.artists.map((artist: any) => Metadata.getArtist(artist.id))),
            features: () => Metadata.getTrackFeatures(data.id)
        }

        return true;
    }

    /**
     * Creates an album and its getters and setters based on given data
     * @param data Metadata from which to create an album
     * @returns Returns a pointer to the newly created album
     */
    private static setAlbum(albums: typeof Metadata.albums, key: string, data: any) {
        albums[key] = {
            type: data.album_type,
            total_tracks: (data as any).total_tracks,
            url: "http://open.spotify.com/albums/" + data.id,
            name: data.name,
            release_date: data.release_date,
            id: data.id,
            genres: data.genres,
            popularity: data.popularity,
            tracks: async () => Promise.all(data.tracks.items.map((item: any) => Metadata.getTrack(item.id))),
            artists: () => Promise.all(data.artists.map((artist: any) => Metadata.getArtist(artist.id))),
        }

        return true;
    }

    /**
     * Creates an artist and its getters and setters based on given data
     * @param data Metadata from which to create an artist
     */
    private static setArtist(artists: typeof Metadata.artists, key: string, data: any) {
        artists[key] = {
            followers: data.followers.total,
            genres: data.genres,
            id: data.id,
            name: data.name,
            url: "http://open.spotify.com/artist/" + data.id,
            popularity: data.popularity,
            albums: () => Metadata.getMultipleAlbums(`/artists/${data.id}/albums`, { pagination: true }),
            top_tracks: () => Metadata.getMultipleTracks(`/artists/${data.id}/top-tracks`, { pagination: true }),
            related_artists: () => Metadata.getMultipleArtists(`artists/${data.id}/related-artists`, { pagination: true })
        }

        return true;
    }

    /**
     * Creates track features and its getters and setters based on given data
     * @param data Metadata from which to create track features
     */
    private static setTrackFeatures(track_features: typeof Metadata.track_features, key: string, data: any) {
        track_features[key] = {
            acousticness: data.acousticness,
            danceability: data.danceability,
            energy: data.energy,
            instrumentalness: data.instrumentalness,
            liveness: data.liveness,
            loudness: data.loudness,
            speechiness: data.speechiness,
            tempo: data.tempo,
            valence: data.valence,
        }

        return true;
    }
}