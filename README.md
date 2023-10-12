# Smart playlists for Spotify
Create smart playlists for Spotify like you can on iTunes / Apple Music.

## What is it
This web app allows you to create smart playlists based on a variety of sources your liked songs, albums of artists, or other playlist you or other people have created.

Now, given a source (or sources), you can enhance your smart playlists based on a variety of filters, such as:
- Track name
- Release date
- Popularity
- Danceability

These playlists are updated about every hour, so if you change another playlist or an artist releases a new album, and your smart playlist has this as a source, it will be updated automatically. Isn't that convenient?

## Spotify API
This application uses the Spotify API to automate playlists. You can read more about the API [here](https://developer.spotify.com/documentation/web-api/). Whether or not a feature is implementable completely depends on the availablility in the API, so if you have any suggestions, please check the API first.

## Documentation
I make a habit of documenting and adding comments as much as possible, but if you find something that is not clear, please let me know.

## Frontend & backend notes
The backend has its own README, which you can find [here](./backend/README.md). The frontend does not, but for it to function correctly, it needs SASS libraries which NPM can only compile on linux. You will have to fix this yourself.