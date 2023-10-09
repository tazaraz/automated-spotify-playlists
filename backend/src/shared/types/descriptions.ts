import { FilterBoolean, FilterDate, FilterSlider, FilterString, FilterValue } from "../matching"

export const FilterParserOptions = {
    "any": "If any of the following are true",
    "all": "If all of the following are true",
    "none": "If none of the following are true",
}

export const SourceDescription = {
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

export const FilterDescriptions = {
    "Album": {
        "Artists": {
            type: FilterString,
            description: "Artists of the album"
        },
        "Name": {
            type: FilterString,
            description: "Name of the album"
        },
        "Release date": {
            type: FilterDate,
            description: "The release date of the album. May contain only a year or a year and month"
        },
        "Track count": {
            type: FilterValue,
            description: "Amount of tracks in the album"
        },
        "Genres": {
            type: FilterString,
            description: "A list of the genres the album is associated with. If not yet classified, the array is empty."
        },
        "Popularity": {
            type: FilterSlider,
            description: "The popularity of the album. Ranges from 0.0 - 10.0"
        },
    },
    "Artist": {
        "Name": {
            type: FilterString,
            description: "Name of the artist"
        },
        "Genres": {
            type: FilterString,
            description: "Type of genres the artist produces"
        },
        "Popularity": {
            type: FilterSlider,
            description: "The popularity of the artist. The artist's popularity is calculated from the popularity of all the artist's tracks and ranges from 0.0 - 10.0"
        },
        "Followers": {
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
            type: FilterString,
            description: "Name of the track"
        },
        "Popularity": {
            type: FilterSlider,
            description: "The popularity of the track. Generally speaking, songs that are being played a lot now will have a higher popularity than songs that were played a lot in the past and ranges from 0.0 - 10.0"
        },
        "Duration": {
            type: FilterValue,
            description: "Duration of the track in seconds"
        },
        "Accousticness": {
            type: FilterSlider,
            description: "A confidence measure from 0.0 to 10.0 of whether the track is acoustic. 10.0 represents high confidence the track is acoustic."
        },
        "Danceability": {
            type: FilterSlider,
            description: "How suitable a track is for dancing based on a combination of musical elements including tempo, rhythm stability, beat strength, and overall regularity"
        },
        "Energy": {
            type: FilterSlider,
            description: "A perceptual measure of intensity and activity. Typically, energetic tracks feel fast, loud, and noisy. For example, death metal has high energy, while a Bach prelude scores low on the scale. Perceptual features contributing to this attribute include dynamic range, perceived loudness, timbre, onset rate, and general entropy"
        },
        "Vocality": {
            type: FilterSlider,
            description: "Whether someone is singing in the track"
        },
        "Loudness": {
            type: FilterSlider,
            description: "The overall loudness of a track in decibels (dB). Loudness values are averaged across the entire track. Values typically range between -60 and 0 db."
        },
        "Liveness": {
            type: FilterSlider,
            description: "Whether an audience is present in the track. Higher liveness values represent an increased probability that the track was performed live. A value above 8.0 provides strong likelihood that the track is live."
        },
        "BPM": {
            type: FilterValue,
            description: "The overall tempo of a track in beats per minute"
        },
        "Positivity": {
            type: FilterSlider,
            description: "The musical positiveness conveyed by a track. Tracks with high valence sound more positive (e.g. happy, cheerful, euphoric), while tracks with low valence sound more negative (e.g. sad, depressed, angry)."
        }
    },
}
