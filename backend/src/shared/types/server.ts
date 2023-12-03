import { CAlbum, CArtist, CTrack, CTrackFeatures } from "./client";

export type Generic = STrack | SAlbum | SArtist;

/**
 * Filtering can use multiple types and thus it is not efficient to parse everything down to a track. This interface
 * represents multiple input types for the filter mechanism, allowing us to directly operate on data from Spotify,
 * instead of converting everything to an STrack (albeit at the cost of some more logic and complexity).
 * Example: when a user request all albums of an artist and filters on their names, this interface allows us to get the
 * album name immediately (album.name) instead of first getting all the tracks of the album, after which we get the
 * name (album.tracks() -> track.album().name).
 */
export type FilterItem<T extends Generic> = T & {
    kind: "track" | "album" | "artist"
}

export interface DBUser {
    name: string;
    id: string;
    country: string;
    refresh_token: string;
}

export interface SUser extends DBUser {
    access_token: string;
    access_token_expiry: Date;
}

/**
 * This track contains all data possibly required by any of the filters to do their job
 */
// @ts-ignore
export interface STrack extends CTrack {
    // How long the song plays for in ms
    duration_ms: number
    // Whether the track is a local file
    is_local: boolean
    // Album the track belongs to
    album: () => Promise<FilterItem<SAlbum>>
    // Artists who made the song
    artists: () => Promise<FilterItem<SArtist>[]>
    // The track's features
    features: () => Promise<STrackFeatures>;
}

// @ts-ignore
export interface SAlbum extends CAlbum {
    // Tracks in this album
    tracks: () => Promise<FilterItem<STrack>[]>
    // Artists who created this album
    artists: () => Promise<FilterItem<SArtist>[]>
}

export interface SArtist extends CArtist {
    // Album the track belongs to
    albums: () => Promise<FilterItem<SAlbum>[]>
    // The top tracks of the artist
    top_tracks: () => Promise<FilterItem<STrack>[]>
    // Related artists:
    related_artists: () => Promise<FilterItem<SArtist>[]>
}

export interface STrackFeatures extends CTrackFeatures {}