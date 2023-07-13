import { Album, Artist, Track, TrackFeatures } from "../processing/filters";
import { FilterBoolean, FilterDate, FilterSlider, FilterString, FilterValue } from "../processing/matching";
import { FilterDescription, SourceDescription } from "./descriptions";

export const Sources = {
    "Library": {
        value: "Library",
        description: SourceDescription.Library
    },
    "Playlist tracks": {
        value: "Playlist",
        description: SourceDescription["Playlist tracks"]
    },
    "Artist's Tracks": {
        value: "Artist",
        description: SourceDescription["Artist's Tracks"]
    },
    "Artist's Albums": {
        value: "Artist",
        description: SourceDescription["Artist's Albums"]
    },
    "Artist's Top Tracks": {
        value: "Artist",
        description: SourceDescription["Artist's Top Tracks"]
    },
    "Artist's Related Artists": {
        value: "Artist",
        description: SourceDescription["Artist's Related Artists"]
    },
    // "Recommendations": {
    //     value: { "seed_tracks": [] as string[], "seed_genres": [] as string[], "seed_artists": [] as string[] },
    //     description: SourceDescription.Recommendations
    // }
}

export const Filters = {
    "Album": {
        "Artists": {
            filter: Album.Artists,
            type: FilterString,
            description: FilterDescription.Album.Artists
        },
        "Name": {
            filter: Artist.Name,
            type: FilterString,
            description: FilterDescription.Artist.Name
        },
        "Release date": {
            filter: Album.ReleaseDate,
            type: FilterDate,
            description: FilterDescription.Album["Release date"]
        },
        "Track count": {
            filter: Album.TrackCount,
            type: FilterValue,
            description: FilterDescription.Album["Track count"]
        },
        "Genres": {
            filter: Album.Genres,
            type: FilterString,
            description: FilterDescription.Album.Genres
        },
        "Popularity": {
            filter: Album.Popularity,
            type: FilterSlider,
            description: FilterDescription.Album.Popularity
        },
    },
    "Artist": {
        "Name": {
            filter: Artist.Name,
            type: FilterString,
            description: FilterDescription.Artist.Name
        },
        "Genres": {
            filter: Artist.Genres,
            type: FilterString,
            description: FilterDescription.Artist.Genres
        },
        "Popularity": {
            filter: Artist.Popularity,
            type: FilterSlider,
            description: FilterDescription.Artist.Popularity
        },
        "Followers": {
            filter: Artist.Followers,
            type: FilterValue,
            description: FilterDescription.Artist.Followers
        },
    },
    "Track": {
        "is Loved": {
            type: FilterBoolean,
            description: FilterDescription.Track["is Loved"]
        },
        "Name": {
            filter: Track.Name,
            type: FilterString,
            description: FilterDescription.Track.Name
        },
        "Popularity": {
            filter: Track.Popularity,
            type: FilterSlider,
            description: FilterDescription.Track.Popularity
        },
        "Duration": {
            filter: Track.Duration,
            type: FilterValue,
            description: FilterDescription.Track.Duration
        },
        "is Acoustic": {
            filter: TrackFeatures.Acoustic,
            type: FilterBoolean,
            description: FilterDescription.Track["is Acoustic"]
        },
        "Danceability": {
            filter: TrackFeatures.Danceability,
            type: FilterSlider,
            description: FilterDescription.Track.Danceability
        },
        "Energy": {
            filter: TrackFeatures.Energy,
            type: FilterSlider,
            description: FilterDescription.Track.Energy
        },
        "has Vocals": {
            filter: TrackFeatures.Vocals,
            type: FilterBoolean,
            description: FilterDescription.Track["has Vocals"]
        },
        "Loudness": {
            filter: TrackFeatures.Loudness,
            type: FilterValue,
            description: FilterDescription.Track.Loudness
        },
        "is Live": {
            filter: TrackFeatures.Live,
            type: FilterBoolean,
            description: FilterDescription.Track["is Live"]
        },
        "BPM": {
            filter: TrackFeatures.BPM,
            type: FilterValue,
            description: FilterDescription.Track.BPM
        },
        "Positivity": {
            filter: TrackFeatures.Positivity,
            type: FilterSlider,
            description: FilterDescription.Track.Positivity
        }
    },
}
