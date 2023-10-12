import { Playlist } from "./playlist";

export interface CUser {
    name: string;
    id: string;
    country: string;

    spotify_token: string;
    spotify_token_expiry: number;
    server_token: string;
    server_token_expiry: number;
}

export interface CPlaylist extends Playlist {
    // Contains the tracks of the playlist in the order spotify returns them
    all_tracks: string[];

    owner: {
        id: string;
        display_name: string;
        country: string;
    }
}

export interface CTrack {
    // Disc number, default 1
    disc_number: number
    // Track number
    track_number: number
    // Url to the track in spotify
    url: string
    // ID of the track
    id: string
    // Name of the track
    name: string
    // A value ranging from 0 - 100
    popularity: number
    // Length of the track
    duration?: string
    // Url of the artwork
    image?: string
    // Album of the track
    album?: CAlbum
    // Artists of the track
    artists?: CArtist[]
    // The track's features
    features?: CTrackFeatures
}

export interface CAlbum {
    type: "album" | "single" | "compilation"
    total_tracks: number
    // Url to the album in spotify
    url: string
    // Name of the album
    name: string
    // Release date
    release_date: number
    // ID of the album
    id: string
    // Popularity of the album
    popularity: number
    // Genres associated with this album. Might be empty
    genres: string[]
    // Url of the artwork
    image?: string
    // Artists of the album
    artists?: CArtist[]
    // Tracks of the album
    tracks?: CTrack[]
}

export interface CArtist {
    // amount of people following this artist
    followers: number
    // Genres associated with this artist
    genres: string[]
    // ID of the artist
    id: string
    // Name of the artist
    name: string
    // Url to the artist in spotify
    url: string
    // A value ranging from 0 - 100
    popularity: number
    // Url of the artwork
    image?: string
}

export interface CTrackFeatures {
    // The acousticness of the track
    acousticness: number
    // The danceability of the track
    danceability: number
    // The energy of the track
    energy: number
    // The instrumentalness of the track
    instrumentalness: number
    // The liveness of the track
    liveness: number
    // The loudness of the track
    loudness: number
    // The speechiness of the track
    speechiness: number
    // The tempo of the track in bpm
    tempo: number
    // The valence of the track
    valence: number
}
