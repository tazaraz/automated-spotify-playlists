import { LOG_DEBUG, THROW_DEBUG_ERROR } from "../main";
import Fetch, { FetchOptions } from "../tools/fetch";
import { FilterItem, SUser } from "../shared/types/server";
import { SAlbum, SArtist, STrack, STrackFeatures } from "../shared/types/server";
import Cache from "./cache";

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

/**
 * This class is used to get metadata from Spotify.
 */
export default class Metadata {
    static track_queue = new Queue((items: string[]) => Metadata.getMultipleTracks("/tracks", {
        user: Metadata.API_USER,
        ids: items
    }));
    static album_queue = new Queue((items: string[]) => Metadata.getMultipleAlbums("/albums", {
        user: Metadata.API_USER,
        ids: items, limit: 20
    }));
    static artist_queue = new Queue((items: string[]) => Metadata.getMultipleArtists("/artists", {
        user: Metadata.API_USER,
        ids: items
    }));
    static track_features_queue = new Queue((items: string[]) => Metadata.getMultipleTrackFeatures("/audio-features", {
        user: Metadata.API_USER,
        ids: items
    }));

    /** This contains a user used for global API calls */
    static API_USER: SUser;

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
        const cached = await cache[id];
        if (cached !== undefined)
            return cached;

        // Get the Metadata
        await queue.add(id);

        // Return the value
        return await cache[id];
    }

    static async getTrack(track_id: string): Promise<FilterItem<STrack>> {
        return await Metadata.getItem(Cache.tracks, Metadata.track_queue, track_id) as FilterItem<STrack>;
    }

    static async getAlbum(album_id: string): Promise<FilterItem<SAlbum>> {
        return await Metadata.getItem(Cache.albums, Metadata.album_queue, album_id) as FilterItem<SAlbum>;
    }

    static async getArtist(artist_id: string): Promise<FilterItem<SArtist>> {
        return await Metadata.getItem(Cache.artists, Metadata.artist_queue, artist_id) as FilterItem<SArtist>;
    }

    static async getTrackFeatures(track_id: string): Promise<STrackFeatures> {
        const item = await Metadata.getItem(Cache.track_features, Metadata.track_features_queue, track_id);
        return item;
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
        const cached = await Cache.url_cache[url];
        if (cached !== undefined)
            return await Promise.all(cached.map(id => cache[id]));

        // Make a note of which items we already have
        options.ids = options.ids ?? [];
        const missing_data_ids = await Promise.all(options.ids.filter(id => cache[id] !== undefined));
        const present_data_ids = options.ids.filter(id => !missing_data_ids.includes(id));

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
        let items = await Promise.all(present_data_ids.map(id => cache[id]));

        // Store the new items
        for (let item of data) {
            // Try setting the items. However, if the specified endpoint does not return all the missing_data_ids data,
            // the item will be fetched from the API
            try {
                cache[item.id] = item;
            } catch (error) {
                // Some attribute is missing, get the full item from the API
                switch(url) {
                    case "/tracks": await Metadata.getTrack(item.id); break;
                    case "/albums": await Metadata.getAlbum(item.id); break;
                    case "/artists": await Metadata.getArtist(item.id); break;
                    case "/audio-features": await Metadata.getTrackFeatures(item.id); break;
                    default:
                        THROW_DEBUG_ERROR(`getMultiple: The endpoint '${url}' returned incomplete data'`);
                }
            }

            items.push(await cache[item.id]);
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
            Cache.url_cache[url] = items.map(item => (item as any).id)
        }

        return items;
    }

    static async getMultipleTracks(url="/tracks", options: FetchOptions = {}): Promise<FilterItem<STrack>[]> {
        const items = await Metadata.getMultiple(url, Cache.tracks, options) as FilterItem<STrack>[];
        //       items.forEach(item => item.kind = "track");
        // return items;
        try {
            items.forEach(item => item.kind = "track");
            return items;
        } catch (error) {
            // Count how many items are undefined, not and the total and log this
            console.log(
                "Undefined items:",
                items.map(i => i == undefined).length,
                "out of",
                items.length
            );
            throw error;
        }
    }

    static async getMultipleAlbums(url="/albums", options: FetchOptions = {}): Promise<FilterItem<SAlbum>[]> {
        const items = await Metadata.getMultiple(url, Cache.albums, options) as FilterItem<SAlbum>[];
              items.forEach(item => item.kind = "album");
        return items;
    }

    static async getMultipleArtists(url="/artists", options: FetchOptions = {}): Promise<FilterItem<SArtist>[]> {
        const items = await Metadata.getMultiple(url, Cache.artists, options) as FilterItem<SArtist>[];
              items.forEach(item => item.kind = "artist");
        return items;
    }

    static getMultipleTrackFeatures(url="/audio-features", options: FetchOptions = {}) {
        return Metadata.getMultiple(url, Cache.track_features as any, options);
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
        options: FetchOptions,
    ): Promise<FilterItem<T>[]> {
        let items: FilterItem<any>[];

        // If this url is known for a specific user, use the cached data (if not expired)
        const cached = await Cache.user_cache[`${options.user.id}:${url}`];
        if (cached !== undefined) {
            switch (kind) {
                case "track":
                    items = cached.map(id => Metadata.getTrack(id))
                    break;
                case "album":
                    items = cached.map(id => Metadata.getAlbum(id))
                    break;
                case "artist":
                    items = cached.map(id => Metadata.getArtist(id))
                    break;
            }

            return await Promise.all(items);
        }

        switch (kind) {
            case "track":
                items = await Metadata.getMultipleTracks(url, options);
                break;
            case "album":
                items = await Metadata.getMultipleAlbums(url, options);
                break;
            case "artist":
                items = await Metadata.getMultipleArtists(url, options);
                break;
        }

        // Store the data
        Cache.user_cache[`${options.user.id}:${url}`] = items.map(item => item.id);
        return items as FilterItem<T>[];
    }
}