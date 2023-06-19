export const SourceDescription = {
    "Library": "Gets tracks from your library",
    "Playlist tracks": "Gets tracks from a playlist",
    "Artist's Tracks": "Gets all the tracks of the given artist",
    "Artist's Albums": "Gets all the album tracks of the given artist",
    "Artist's Top Tracks": "Gets the top tracks of an artist based on the country of the user (configured in Spotify)",
    "Artist's Related Artists": "Artists who are determined to produce the same kind of music based on the analysis of Spotify community's listening history. Only the top 3 are used.",
    "Recommendations": "Gets recommendations based on the given seeds (tracks, artists or genres). The seeds can be a combination of multiple types, as long as at least one seed is given. Keep in mind that a lot of obscure seeds, such as new artists, can result in no recommendations being found."
}

export const FilterDescription = {
    "Album": {
        "Artists": "Artists of the album",
        "Name": "Name of the album",
        "Release date": "The release date of the album. May contain only a year or a year and month",
        "Track count": "Amount of tracks in the album",
        "Genres": "A list of the genres the album is associated with. If not yet classified, the array is empty.",
    },
    "Artist": {
        "Name": "Name of the artist",
        "Genres": "Type of genres the artist produces",
        "Popularity": "The popularity of the artist. The artist's popularity is calculated from the popularity of all the artist's tracks and ranges from 0 - 100.",
        "Followers": "The amount of people following the artist",
    },
    "Track": {
        "is Loved": "Whether the track is present in your library",
        "Name": "Name of the track",
        "Popularity": "The popularity of the track. Generally speaking, songs that are being played a lot now will have a higher popularity than songs that were played a lot in the past and ranges from 0 - 100",
        "Duration": "Duration of the track in seconds",
        "is Acoustic": "Whether the track is acoustic",
        "Danceability": "How suitable a track is for dancing based on a combination of musical elements including tempo, rhythm stability, beat strength, and overall regularity",
        "Energy": "A perceptual measure of intensity and activity. Typically, energetic tracks feel fast, loud, and noisy. For example, death metal has high energy, while a Bach prelude scores low on the scale. Perceptual features contributing to this attribute include dynamic range, perceived loudness, timbre, onset rate, and general entropy",
        "has Vocals": "Whether a someone is singing in the track",
        "Loudness": "The overall loudness of a track in decibels (dB). Loudness values are averaged across the entire track. Values typically range between -60 and 0 db.",
        "is Live": "Whether an audience is present in the track",
        "BPM": "The overall tempo of a track in beats per minute",
        "Positivity": "The musical positiveness conveyed by a track. Tracks with high valence sound more positive (e.g. happy, cheerful, euphoric), while tracks with low valence sound more negative (e.g. sad, depressed, angry)."
    },
}
