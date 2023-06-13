import { FilterBoolean, FilterDate, FilterSlider, FilterString, FilterValue } from "./processing/matching"
import { Album, Artist, Track, TrackFeatures } from "./processing/filters"

export const AvailableSources = {
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
    "Recommendations": {
        value: {"seed_tracks": [], "seed_artists": [], "seed_genres": []},
        description: "Gets recommendations based on the given seeds (tracks, artists or genres). The seeds can be a combination of multiple types, as long as at least one seed is given. Keep in mind that a lot of obscure seeds, such as new artists, can result in no recommendations being found."
    }
}

export const AvailableFilters = {
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
            description: "The popularity of the artist. The artist's popularity is calculated from the popularity of all the artist's tracks."
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
            description: "The popularity of the track. Generally speaking, songs that are being played a lot now will have a higher popularity than songs that were played a lot in the past"
        },
        "Duration": {
            filter: Track.Duration,
            type: FilterValue,
            description: "Duration of the track in seconds"
        },
        "is Acoustic": {
            filter: TrackFeatures.Acoustic,
            type: FilterBoolean,
            description: "Whether the track is acoustic"
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
        "has Vocals": {
            filter: TrackFeatures.Vocals,
            type: FilterBoolean,
            description: "Whether a track contains vocals"
        },
        "Loudness": {
            filter: TrackFeatures.Loudness,
            type: FilterValue,
            description: "The overall loudness of a track in decibels (dB). Loudness values are averaged across the entire track. Values typically range between -60 and 0 db."
        },
        "is Live": {
            filter: TrackFeatures.Live,
            type: FilterBoolean,
            description: "Whether an audience is present in the track"
        },
        // "Speech": {
        //     filter: TrackFeatures.Speech,
        //     type: FilterSpeech,
        //     description: "The presence of spoken words in a track."
        // },
        "Tempo": {
            filter: TrackFeatures.Tempo,
            type: FilterValue,
            description: "The overall tempo of a track in beats per minute (BPM)"
        },
        "Positivity": {
            filter: TrackFeatures.Positivity,
            type: FilterSlider,
            description: "The musical positiveness conveyed by a track. Tracks with high valence sound more positive (e.g. happy, cheerful, euphoric), while tracks with low valence sound more negative (e.g. sad, depressed, angry)."
        }
    },
}
