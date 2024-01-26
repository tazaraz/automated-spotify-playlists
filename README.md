# Automated playlists for Spotify
Create automated playlists for Spotify like you can with iTunes / Apple Music.

## What is it
This web app allows you to create automated playlists based on a variety of sources your liked songs, albums of artists, or other playlist you or other people have created.

Now, given a source (or sources), you can enhance your automated playlists based on a variety of filters, such as:
- Track name
- Release date
- Popularity
- Danceability

These playlists are updated about every hour, so if you change another playlist or an artist releases a new album, and your automated playlist has this as a source, it will be updated automatically. Isn't that convenient?

## Spotify API
This application uses the Spotify API to automate playlists. You can read more about the API [here](https://developer.spotify.com/documentation/web-api/). Whether or not a feature is implementable firstly depends on the availablility in the API, so if you have any suggestions, please check the API first. After that, it should not require too much compute for the filters to process everything.

## Documentation
I try to make a habit of documenting and adding comments as much as possible. If you find something that is not obvious, please let me know.

## Frontend & backend notes
The backend has its own README, which you can find [here](./backend/). The frontend does not, but for it to function correctly, it needs SASS libraries which NPM can only compile on linux. This requires entering the frontend container and executing the command `npm i` manually.
