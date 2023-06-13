import { CAlbum, CArtist, CTrack, CTrackFeatures, CUser } from "./client";

/**
 * Filtering can use multiple types and thus it is not efficient to parse everything down to a track. This interface
 * represents multiple input types for the filter mechanism, allowing us to directly operate on data from Spotify,
 * instead of converting everything to an STrack (albeit at the cost of some more logic and complexity).
 * Example: when a user request all albums of an artist and filters on their names, this interface allows us to get the
 * album name immediately (album.name) instead of first getting all the tracks of the album, after which we get the
 * name (album.tracks() -> track.album().name).
 */
export interface FilterItem extends STrack, SAlbum, SArtist {
    kind: "track" | "album" | "artist"
}

export interface SUser extends CUser {
    access_token: string;
    access_token_valid_until: Date;
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
    album: () => Promise<SAlbum>
    // Artists who made the song
    artists: () => Promise<SArtist[]>
    // The track's features
    features: () => Promise<STrackFeatures>;
}

export interface SAlbum extends CAlbum {
    // Tracks in this album
    tracks: () => Promise<STrack[]>
    // Artists who created this album
    artists: () => Promise<SArtist[]>
}

export interface SArtist extends CArtist {
    // Album the track belongs to
    albums: () => Promise<SAlbum[]>
    // The top tracks of the artist
    top_tracks: () => Promise<STrack[]>
    // Related artists:
    related_artists: () => Promise<SArtist[]>
}

export interface STrackFeatures extends CTrackFeatures {}