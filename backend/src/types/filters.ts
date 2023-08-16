import { Album, Artist, Track, TrackFeatures } from "../processing/filters";
import { FilterBoolean, FilterDate, FilterSlider, FilterString, FilterValue } from "../processing/matching";

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
            description: "Artists of the album"
        },
        "Name": {
            filter: Artist.Name,
            type: FilterString,
            description: "Name of the album"
        },
        "Release date": {
            filter: Album.ReleaseDate,
            type: FilterDate,
            description: "The release date of the album. May contain only a year or a year and month"
        },
        "Track count": {
            filter: Album.TrackCount,
            type: FilterValue,
            description: "Amount of tracks in the album"
        },
        "Genres": {
            filter: Album.Genres,
            type: FilterString,
            description: "A list of the genres the album is associated with. If not yet classified, the array is empty."
        },
        "Popularity": {
            filter: Album.Popularity,
            type: FilterSlider,
            description: "The popularity of the album. Ranges from 0 - 10."
        },
    },
    "Artist": {
        "Name": {
            filter: Artist.Name,
            type: FilterString,
            description: "Name of the artist"
        },
        "Genres": {
            filter: Artist.Genres,
            type: FilterString,
            description: "Type of genres the artist produces"
        },
        "Popularity": {
            filter: Artist.Popularity,
            type: FilterSlider,
            description: "The popularity of the artist. The artist's popularity is calculated from the popularity of all the artist's tracks and ranges from 0 - 10."
        },
        "Followers": {
            filter: Artist.Followers,
            type: FilterValue,
            description: "The amount of people following the artist"
        },
    },
    "Track": {
        "is Loved": {
            type: FilterBoolean,
            description: "Whether the track is present in your library"
        },
        "Name": {
            filter: Track.Name,
            type: FilterString,
            description: "Name of the track"
        },
        "Popularity": {
            filter: Track.Popularity,
            type: FilterSlider,
            description: "The popularity of the track. Generally speaking, songs that are being played a lot now will have a higher popularity than songs that were played a lot in the past and ranges from 0 - 10"
        },
        "Duration": {
            filter: Track.Duration,
            type: FilterValue,
            description: "Duration of the track in seconds"
        },
        "Accousticness": {
            filter: TrackFeatures.Acoustic,
            type: FilterSlider,
            description: "Whether the track Accousticness"
        },
        "Danceability": {
            filter: TrackFeatures.Danceability,
            type: FilterSlider,
            description: "How suitable a track is for dancing based on a combination of musical elements including tempo, rhythm stability, beat strength, and overall regularity"
        },
        "Energy": {
            filter: TrackFeatures.Energy,
            type: FilterSlider,
            description: "A perceptual measure of intensity and activity. Typically, energetic tracks feel fast, loud, and noisy. For example, death metal has high energy, while a Bach prelude scores low on the scale. Perceptual features contributing to this attribute include dynamic range, perceived loudness, timbre, onset rate, and general entropy"
        },
        "Vocality": {
            filter: TrackFeatures.Vocality,
            type: FilterSlider,
            description: "Whether someone is singing in the track"
        },
        "Loudness": {
            filter: TrackFeatures.Loudness,
            type: FilterValue,
            description: "The overall loudness of a track in decibels (dB). Loudness values are averaged across the entire track. Values typically range between -60 and 0 db."
        },
        "Liveness": {
            filter: TrackFeatures.Live,
            type: FilterSlider,
            description: "Whether an audience is present in the track. Higher liveness values represent an increased probability that the track was performed live. A value above 0.8 provides strong likelihood that the track is live."
        },
        "BPM": {
            filter: TrackFeatures.BPM,
            type: FilterValue,
            description: "The overall tempo of a track in beats per minute"
        },
        "Positivity": {
            filter: TrackFeatures.Positivity,
            type: FilterSlider,
            description: "The musical positiveness conveyed by a track. Tracks with high valence sound more positive (e.g. happy, cheerful, euphoric), while tracks with low valence sound more negative (e.g. sad, depressed, angry)."
        }
    },
}

export const FilterParserOptions = {
    "any": "If any of the following are true",
    "all": "If all of the following are true",
    "none": "If none of the following are true",
}
