# The backend
An automated playlist, as defined in `src/types/playlist.ts`, has two fields which are the main focus of this application: `sources` and `filters`. The `sources` field is an array of `PlaylistSource` objects and the `filters` field is combination of `PlaylistStatement` and `PlaylistCondition` objects.

## Stores
We have 3 stores:
|||
|-|-|
|`Metadata`| Caches as much metadata about tracks, albums, and artists, as possible such that we don't have to ask Spotify for it every time|
|`Users`| Stores information about the users which are known to us, as well as their refresh token such that we don't have to retrieve it from the database every time|
|`Filterlog`| Stores the logs produced while executing an automated playlist. This can then be retrieved via the API. |


## Processing a playlist configuration
A playlist is configured by the user in the frontend, and is processed in backend. The processing starting point is in `src/processing/index.ts` as the function `Filters.execute`. This function prepares the processing stage by doing some checks and retrieving all the sources. We then move to `Filters.process`, which applies filters and tries to detect if a user has manually included or excluded a track, as these tracks should be included/excluded in the future as well. Then the difference between the current playlist tracks and the processed result is calculated and the playlist is updated accordingly.

### Sources and filters
`Sources` are processed in `src/processing/sources.ts` and is a simple while loop over the array
`filters` are processed in `src/processing/parser.ts`. Filters consist of two types, one being an actual filter, such as a release date or a name matcher, while the other contains a list of filters and specifies if all filters containing it should be true or false.

### Shared
Some data types are shared between the frontend and backend. With the notabe exception of `shared/types/filters`, these files should never contain any dependencies on the frontend or backend. This is to ensure that the frontend and backend can be developed independently of each other. If neglected, the frontend might try to resolve the complete backend (or the backend the frontend). Not very nice.