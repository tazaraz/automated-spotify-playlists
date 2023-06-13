# Stores
These files are classes which are created only once and are used to store data to allow easier access to Spotify data.

## Metadata
This class is used to cache as much as possible from spotify, while allowing easy access to the data itself.

## Snapshots
Each playlist has an unique snapshot_id, which can be used to check if the playlist has changed. This class is used to store the snapshot_id of each playlist, so that we can check if the playlist has changed.

## Users
Stores the users from the database, together with access tokens.

## FilterLog
Stores logs when a smart playlist is executing. Allows awaitable the detection of a change in the logs.