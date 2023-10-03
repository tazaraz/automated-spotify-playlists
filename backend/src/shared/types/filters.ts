import { Album, Artist, Track, TrackFeatures } from "../../processing/filters";
import { FilterBoolean, FilterDate, FilterSlider, FilterString, FilterValue } from "../matching";
import { FilterDescriptions } from "./descriptions";

export const Sources = {
    "Library": {
        value: "Library",
        description: "Gets tracks from your library"
    },
    "Playlist tracks": {
        value: "Playlist",
        description: "Gets tracks from a playlist"
    },
    "Artist's Tracks": {
        value: "Artist",
        description: "Gets all the tracks of the given artist"
    },
    "Artist's Albums": {
        value: "Artist",
        description: "Gets all the album tracks of the given artist"
    },
    "Artist's Top Tracks": {
        value: "Artist",
        description: "Gets the top tracks of an artist based on the country of the user (configured in Spotify)"
    },
    "Artist's Related Artists": {
        value: "Artist",
        description: "Artists who are determined to produce the same kind of music based on the analysis of Spotify community's listening history. Only the top 3 are used."
    },
    // "Recommendations": {
    //     value: { "seed_tracks": [] as string[], "seed_genres": [] as string[], "seed_artists": [] as string[] },
    //     description: "Gets recommendations based on the given seeds (tracks, artists or genres). The seeds can be a combination of multiple types, as long as at least one seed is given. Keep in mind that a lot of obscure seeds, such as new artists, can result in no recommendations being found."
    // }
}

export const Filters = {
    "Album": {
        "Artists": {
            filter: Album.Artists,
            type: FilterString,
            ...FilterDescriptions.Album["Artists"]
        },
        "Name": {
            filter: Artist.Name,
            type: FilterString,
            ...FilterDescriptions.Album["Name"]
        },
        "Release date": {
            filter: Album.ReleaseDate,
            type: FilterDate,
            ...FilterDescriptions.Album["Release date"]
        },
        "Track count": {
            filter: Album.TrackCount,
            type: FilterValue,
            ...FilterDescriptions.Album["Track count"]
        },
        "Genres": {
            filter: Album.Genres,
            type: FilterString,
            ...FilterDescriptions.Album["Genres"]
        },
        "Popularity": {
            filter: Album.Popularity,
            type: FilterSlider,
            ...FilterDescriptions.Album["Popularity"]
        },
    },
    "Artist": {
        "Name": {
            filter: Artist.Name,
            type: FilterString,
            ...FilterDescriptions.Artist["Name"]
        },
        "Genres": {
            filter: Artist.Genres,
            type: FilterString,
            ...FilterDescriptions.Artist["Genres"]
        },
        "Popularity": {
            filter: Artist.Popularity,
            type: FilterSlider,
            ...FilterDescriptions.Artist["Popularity"]
        },
        "Followers": {
            filter: Artist.Followers,
            type: FilterValue,
            ...FilterDescriptions.Artist["Followers"]
        },
    },
    "Track": {
        "is Loved": {
            type: FilterBoolean,
            ...FilterDescriptions.Track["is Loved"]
        },
        "Name": {
            filter: Track.Name,
            type: FilterString,
            ...FilterDescriptions.Track["Name"]
        },
        "Popularity": {
            filter: Track.Popularity,
            type: FilterSlider,
            ...FilterDescriptions.Track["Popularity"]
        },
        "Duration": {
            filter: Track.Duration,
            type: FilterValue,
            ...FilterDescriptions.Track["Duration"]
        },
        "Accousticness": {
            filter: TrackFeatures.Acoustic,
            type: FilterSlider,
            ...FilterDescriptions.Track["Accousticness"]
        },
        "Danceability": {
            filter: TrackFeatures.Danceability,
            type: FilterSlider,
            ...FilterDescriptions.Track["Danceability"]
        },
        "Energy": {
            filter: TrackFeatures.Energy,
            type: FilterSlider,
            ...FilterDescriptions.Track["Energy"]
        },
        "Vocality": {
            filter: TrackFeatures.Vocality,
            type: FilterSlider,
            ...FilterDescriptions.Track["Vocality"]
        },
        "Loudness": {
            filter: TrackFeatures.Loudness,
            type: FilterValue,
            ...FilterDescriptions.Track["Loudness"]
        },
        "Liveness": {
            filter: TrackFeatures.Live,
            type: FilterSlider,
            ...FilterDescriptions.Track["Liveness"]
        },
        "BPM": {
            filter: TrackFeatures.BPM,
            type: FilterValue,
            ...FilterDescriptions.Track["BPM"]
        },
        "Positivity": {
            filter: TrackFeatures.Positivity,
            type: FilterSlider,
            ...FilterDescriptions.Track["Positivity"]
        }
    },
}
