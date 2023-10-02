import { THROW_DEBUG_ERROR } from "../main";
import FilterTask from "../stores/filtertask";
import Metadata from "../stores/metadata";
import { Sources } from "../types/filters";
import { PlaylistSource } from "../types/playlist";
import { FilterItem, SUser } from "../types/server";

export default class MusicSources {
    public static readonly origin = Sources;

    public static async get(
        sources: PlaylistSource[],
        user: SUser,
        task: FilterTask,
        dry_run=false
    ): Promise<FilterItem[]> {
        let tracks, albums, artists, parsed: any[],
            filteritems: FilterItem[] = [];

        Metadata.API_USER = user;

        for (const [index, source] of sources.entries()) {
            // Execute the dry_run if necessary
            if (dry_run) {
                if (Object.keys(Sources).indexOf(source.origin) === -1) {
                    task.log.sources.push(`Source ${index + 1} is not a supported source: ${source.origin}`);
                    THROW_DEBUG_ERROR(`Source ${index + 1} is not a supported source: ${source.origin}`);
                }
                else continue;
            }

            switch (source.origin) {
                case "Library":
                    // The library requires a user specific endpoint. We NEED a special axios instance for this.
                    tracks = await Metadata.getUserData(
                        `/me/tracks`,
                        "track",
                        60 * 60 * 2, // 2 hours
                        { user, pagination: true },
                    );
                    tracks.map(item => (item as FilterItem).kind = "track");
                    parsed = tracks
                    break;

                case "Playlist tracks":
                    tracks = await Metadata.getMultipleTracks(
                        `/playlists/${source.value}/tracks`,
                        { user, pagination: true }
                    );

                    // Convert to FilterItem
                    console.log(tracks)
                    tracks.map(item => (item as FilterItem).kind = "track");
                    parsed = tracks
                    break;

                /**
                 * As the system uses a genric FilterItem, Albums and Tracks are the same: they are converted to the
                 * required type when needed.
                 * This is just for the user.
                 */
                case "Artist's Tracks":
                case "Artist's Albums":
                    albums = await Metadata.getMultipleAlbums(
                        `/artists/${source.value}/albums`,
                        { user, pagination: true, query: { market: user.country, include_groups: "album,single" } }
                    );

                    // Convert to FilterItem
                    albums.map(item =>
                        (item as FilterItem).kind = "album");
                    parsed = albums
                    break;

                case "Artist's Top Tracks":
                    // This endpoint
                    tracks = await Metadata.getMultipleTracks(
                        `/artists/${source.value}/top-tracks`,
                        { user, pagination: true, query: { market: user.country } }
                    );

                    // Convert to FilterItem
                    tracks.map(item => (item as FilterItem).kind = "track");
                    parsed = tracks
                    break;

                /**
                 * This produces an incredible amount of tracks: will be added last
                 * At test run, without any filters, it produced 2.4k tracks for one single artist.
                 * TODO:
                 *  - Correctly sort the filters by artist > album > track
                 *  - Finish the check of the requirement of at least one artist filter.
                */
                // case "Artist's Related Artists":
                //     // Get all related artists
                //     artists = await MetaData.getMultipleArtists(
                //         `/artists/${source.value}/related-artists`,
                //         { axios: axios.get, with_next: true },
                //     );

                //     // Convert to FilterItem
                //     artists.map(item => (item as FilterItem).kind = "artist");
                //     parsed = artists
                //     break;
            }

            filteritems.push(...(parsed as FilterItem[]))
            task.log.sources.push(MusicSources.as_log(index, parsed.length));
        }

        task.log.sources.push(`All given sources resulted in ${filteritems.length} items`);
        return filteritems;
    }

    private static as_log(index: number, count: number) {
        return `Source ${index + 1} yielded ${count} items`;
    }
}