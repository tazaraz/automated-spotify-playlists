import { createClient as createRedisClient, RedisClientType as RedisClient } from 'redis';
import { FilterItem, SAlbum, SArtist, STrack, STrackFeatures } from '../shared/types/server';
import Metadata from './metadata';
import { THROW_DEBUG_ERROR } from '../main';

export default class Cache {
    protected static redisClient: RedisClient;

    /** How long certain data should stay valid before it is considered stale and should be refreshed */
    protected static expiry = {
        url: 60 * 60 * 24,
        user: 60 * 60 * 1,
        data: 60 * 60 * 24 * 7,
    };

    /** Contains known track information */
    public static tracks: { [id: string]: STrack } = {};
    public static albums: { [id: string]: SAlbum } = {};
    public static artists: { [id: string]: SArtist } = {};
    public static track_features: { [id: string]: STrackFeatures } = {};

    /**The value of the url links to the yielded result of that url
     * Getting from this object is async, meaning you will have to await the result
     */
    public static url_cache: {
        [key: string]: string[];
    } = {}

    /**Requests tied to a specific user
     * Getting from this object is async, meaning you will have to await the result
    */
    public static user_cache: {
        [key: string]: string[];
    } = {};

    // Connect to redis
    static async connect() {
        while (true) {
            // Create redis client
            Cache.redisClient = createRedisClient({
                url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
            });

            // Attempt to connect to redis
            try {
                await Cache.redisClient.connect();
                break;
            } catch (err) {
                // If the connection to redis is refused, retry every 5 seconds
                if (err.code === 'ECONNREFUSED') {
                    console.log('Redis connection refused, retrying in 5 seconds...');
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                } else {
                    throw err;
                }
            }
        }
        console.log('Connected to redis jobqueue database');

        Cache.url_cache = new Proxy(Cache.url_cache, {
            set: Cache.setUrlCache,
            get: Cache.getUrlCache,
            deleteProperty: (target: any, prop: any) => Cache.delete(target, prop, "url_cache"),
        })

        Cache.user_cache = new Proxy(Cache.user_cache, {
            set: Cache.setUserCache,
            get: Cache.getUserCache,
            deleteProperty: (target: any, prop: any) => Cache.delete(target, prop, "user_cache"),
        })

        /**We define the getters and setters for the objects */
        Cache.tracks = new Proxy(Cache.tracks, {
            set: Cache.setTrack,
            get: Cache.getTrack,
            has: Cache.hasProperty,
            deleteProperty: (target: any, prop: any) => Cache.delete(target, prop, "track"),
        })
        Cache.albums = new Proxy(Cache.albums, {
            set: Cache.setAlbum,
            get: Cache.getAlbum,
            has: Cache.hasProperty,
            deleteProperty: (target: any, prop: any) => Cache.delete(target, prop, "album"),
        })
        Cache.artists = new Proxy(Cache.artists, {
            set: Cache.setArtist,
            get: Cache.getArtist,
            has: Cache.hasProperty,
            deleteProperty: (target: any, prop: any) => Cache.delete(target, prop, "artist"),
        })
        Cache.track_features = new Proxy(Cache.track_features, {
            set: Cache.setTrackFeatures,
            get: Cache.getTrackFeatures,
            has: Cache.hasProperty,
            deleteProperty: (target: any, prop: any) => Cache.delete(target, prop, "track_features"),
        })
    }

    /**
     * Stores a user specific url in the Redis database
     * @param url_cache Only used to check if an item is already stored in the Redis database
     * @param key Url to set
     * @param ids Result of the url
     */
    private static setUrlCache(url_cache: typeof Cache.url_cache, key: string, ids: string[]) {
        Cache.redisClient.set(`url_cache:${key}`, JSON.stringify(ids), { EX: Cache.expiry.url })
        return true;
    }

    /**
     * Gets the result of a specific url from the Redis database
     * @param url_cache Only used to check if an item is already stored in the Redis database
     * @param key Url to get
     */
    private static async getUrlCache(url_cache: typeof Cache.url_cache, key: string) {
        const item = await Cache.redisClient.get(`url_cache:${key}`)
        if (item === null)
            return undefined;

        // Store the presence of the url_cache
        return JSON.parse(item);
    }

    /**
     * Stores a user specific url in the Redis database
     * @param user_cache Only used to check if an item is already stored in the Redis database
     * @param key Specified as: `UserId:Url` to set
     * @param data Object with an url as key containing the result
     */
    private static setUserCache(user_cache: typeof Cache.user_cache, key: string, ids: any) {
        Cache.redisClient.set(`user_cache:${key}`, JSON.stringify(ids), { EX: Cache.expiry.user })
        return true;
    }

    /**
     * Gets the result of a specific url from the Redis database
     * @param user_cache Only used to check if an item is already stored in the Redis database
     * @param key Specified as: `UserId:Url` to set
     * @param url Url to get
     */
    private static async getUserCache(user_cache: typeof Cache.user_cache, key: string) {
        const item = await Cache.redisClient.get(`user_cache:${key}`)
        if (item === null)
            return undefined;

        // Store the presence of the user_cache
        return JSON.parse(item);
    }

    public static async clearUserCache(user_id: string) {
        // Use the redis scan command to delete all keys that start with the user_id
        const keys = await Cache.redisClient.keys(`user_cache:${user_id}:*`);
        if (keys.length === 0) return true;
        return await Cache.redisClient.del(keys);
    }

    /**
     * Stores a track in the Redis database
     * @param tracks Only used to check if an item is already stored in the Redis database
     * @param id Id of the track to set
     * @param data Data of which the track constists
     */
    private static setTrack(tracks: typeof Cache.tracks, id: string, data: any) {
        Cache.redisClient.set(`track:${id}`, JSON.stringify({
            disc_number: data.disc_number,
            track_number: data.track_number,
            duration_ms: data.duration_ms,
            url: "http://open.spotify.com/track/" + data.id,
            id: data.id,
            name: data.name,
            popularity: data.popularity,
            is_local: data.is_local || false,

            // Only used when loading the Track object
            album_id: data.album.id,
            artist_ids: data.artists.map((artist: any) => artist.id),
        }), { EX: Cache.expiry.data })
        .finally(() => {
            tracks[id] = true as any;
        })
        .catch(err => {
            THROW_DEBUG_ERROR(`Error while setting track ${id} in redis: ${err}`);
        });
        return true;
    }

    /**
     * Stores an album in the Redis database
     * @param albums Only used to check if an item is already stored in the Redis database
     * @param id Id of the album to set
     * @param data Data of which the album constists
     */
    private static setAlbum(albums: typeof Cache.albums, id: string, data: any) {
        Cache.redisClient.set(`album:${id}`, JSON.stringify({
            type: data.album_type,
            total_tracks: (data as any).total_tracks,
            url: "http://open.spotify.com/albums/" + data.id,
            name: data.name,
            release_date: data.release_date,
            id: data.id,
            genres: data.genres,
            popularity: data.popularity,

            // Only used when loading the Album object
            tracks_ids: data.tracks?.items.map((item: any) => item.id),
            artist_ids: data.artists.map((artist: any) => artist.id),
        }), { EX: Cache.expiry.data })
        .finally(() => {
            albums[id] = true as any;
        })
        .catch(err => {
            THROW_DEBUG_ERROR(`Error while setting album ${id} in redis: ${err}`);
        });
        return true;
    }

    /**
     * Stores an artist in the Redis database
     * @param artists Only used to check if an item is already stored in the Redis database
     * @param id Id of the artist to set
     * @param data Data of which the artist constists
     */
    private static setArtist(artists: typeof Cache.artists, id: string, data: any) {
        Cache.redisClient.set(`artist:${id}`, JSON.stringify({
            followers: data.followers.total,
            genres: data.genres,
            id: data.id,
            name: data.name,
            url: "http://open.spotify.com/artist/" + data.id,
            popularity: data.popularity,
        }), { EX: Cache.expiry.data })
        .finally(() => {
            artists[id] = true as any;
        })
        .catch(err => {
            THROW_DEBUG_ERROR(`Error while setting artist ${id} in redis: ${err}`);
        });
        return true;
    }

    /**
     * Stores track features in the Redis database
     * @param track_features Only used to check if an item is already stored in the Redis database
     * @param id Id of the track features to set
     * @param data Data of which the track features constists
     */
    private static setTrackFeatures(track_features: typeof Cache.track_features, id: string, data: any) {
        Cache.redisClient.set(`track_features:${id}`, JSON.stringify({
            acousticness: data.acousticness,
            danceability: data.danceability,
            energy: data.energy,
            instrumentalness: data.instrumentalness,
            liveness: data.liveness,
            loudness: data.loudness,
            speechiness: data.speechiness,
            tempo: data.tempo,
            valence: data.valence,
        }), { EX: Cache.expiry.data })
        .finally(() => {
            track_features[id] = true as any;
        })
        .catch(err => {
            THROW_DEBUG_ERROR(`Error while setting track_features ${id} in redis: ${err}`);
        });
        return true;
    }

    /**
     * Creates a track and its getters and setters based on given data
     * @param tracks Stores only the presence of the track in the Redis database
     * @param data Metadata from which to create a track
     * @returns Returns the newly created track
     */
    private static async getTrack(tracks: typeof Cache.tracks, track_id: string): Promise<FilterItem<STrack> | undefined> {
        const item = await Cache.redisClient.get(`track:${track_id}`);
        if (item === null)
            return undefined;

        // Store the presence of the track
        tracks[track_id] = true as any;
        const track = JSON.parse(item);
        return {
            ...track,
            kind: "track",
            album: () => Metadata.getAlbum(track.album_id),
            artists: () => Promise.all(track.artist_ids.map((id: string) => Metadata.getArtist(id))),
            features: () => Metadata.getTrackFeatures(track.id),
        }
    }

    /**
     * Creates an album and its getters and setters based on given data
     * @param albums Stores only the presence of the album in the Redis database
     * @param data Metadata from which to create an album
     * @returns Returns the newly created album
     */
    private static async getAlbum(albums: typeof Cache.albums, album_id: string): Promise<FilterItem<SAlbum> | undefined> {
        const item = await Cache.redisClient.get(`album:${album_id}`);
        if (item === null)
            return undefined;

        // Store the presence of the album
        albums[album_id] = true as any;
        const album = JSON.parse(item);
        return {
            ...album,
            kind: "album",
            tracks: async () => {
                // If the album was only partially loaded (e.g. missing tracks)
                if (album.track_ids === undefined) {
                    // Delete the album and reload it
                    delete Cache.albums[album.id];
                    await Metadata.getAlbum(album.id);
                    // Return the tracks
                    return Cache.albums[album.id].tracks();
                }
                return Promise.all(album.track_ids.map((id: string) => Metadata.getTrack(id)))
            },
            artists: () => {
                return Promise.all(album.artist_ids.map((id: string) => Metadata.getArtist(id)))
            }
        }
    }

    /**
     * Creates an artist and its getters and setters based on given data
     * @param artists Stores only the presence of the artist in the Redis database
     * @param data Metadata from which to create an artist
     * @returns Returns the newly created artist
     */
    private static async getArtist(artists: typeof Cache.artists, artist_id: string): Promise<FilterItem<SArtist> | undefined> {
        const item = await Cache.redisClient.get(`artist:${artist_id}`);
        if (item === null)
            return undefined;

        // Store the presence of the artist
        artists[artist_id] = true as any;
        const artist = JSON.parse(item);
        return {
            ...artist,
            kind: "artist",
            albums: () => Metadata.getMultipleAlbums(`/artists/${artist.id}/albums`, { pagination: true }),
            top_tracks: () => Metadata.getMultipleTracks(`/artists/${artist.id}/top-tracks`, { pagination: true }),
            related_artists: () => Metadata.getMultipleArtists(`artists/${artist.id}/related-artists`, { pagination: true }),
        }
    }

    /**
     * Creates track features and its getters and setters based on given data
     * @param track_features Stores only the presence of the track features in the Redis database
     * @param data Metadata from which to create track features
     * @returns Returns the newly created track features
     */
    private static async getTrackFeatures(track_features: typeof Cache.track_features, track_id: string): Promise<STrackFeatures | undefined> {
        const item = await Cache.redisClient.get(`track_features:${track_id}`);
        if (item === null)
            return undefined;

        // Store the presence of the track features
        track_features[track_id] = true as any;
        return JSON.parse(item);
    }

    private static delete(target: { [id: string]: any }, prop: string, prefix: string){
        Cache.redisClient.del(`${prefix}:${prop}`);
        delete target[prop];
        return true;
    }

    private static hasProperty(prop: string, prefix: string) {
        THROW_DEBUG_ERROR("hasProperty is not implemented");
        return false;
    }
}