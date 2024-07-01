import { THROW_DEBUG_ERROR } from "../main";
import FilterTask from "../stores/filtertask";
import Metadata from "../stores/metadata";
import { Sources } from "../shared/types/filters";
import { PlaylistSource } from "../shared/types/playlist";
import { FilterItem, Generic, SAlbum, STrack, SUser } from "../shared/types/server";
import { ProcessLevel } from ".";

export default class MusicSources {
    public static readonly origin = Sources;

    public static async get(
        sources: PlaylistSource[],
        user: SUser,
        task: FilterTask
    ) {
        let items: FilterItem<Generic>[], filteritems: FilterItem<Generic>[] = [];

        Metadata.API_USER = user;

        for (const [index, source] of sources.entries()) {
            // Execute the dry_run if necessary
            if (task.plevel == ProcessLevel.DRY_RUN) {
                if (Object.keys(Sources).indexOf(source.origin) === -1) {
                    task.log.sources.push(`Source ${index + 1} is not a supported source: ${source.origin}`);
                    THROW_DEBUG_ERROR(`Source ${index + 1} is not a supported source: ${source.origin}`);
                }
                else continue;
            }

            switch (source.origin) {
                case "Library":
                    // The library requires a user specific endpoint. We NEED a special axios instance for this.
                    items = await Metadata.getUserData<STrack>(
                        `/me/tracks`,
                        "track",
                        { user, pagination: true },
                    );
                    break;

                case "Playlist tracks":
                    items = await Metadata.getMultipleTracks(
                        `/playlists/${source.value}/tracks`,
                        { user, pagination: true }
                    );
                    break;

                /**
                 * As the system uses a genric FilterItem, Albums and Tracks are the same: they are converted to the
                 * required type when needed.
                 * This is just for the user.
                 */
                case "Artist's Tracks":
                case "Artist's Albums":
                    items = await Metadata.getMultipleAlbums(
                        `/artists/${source.value}/albums`,
                        { user, pagination: true, query: { market: user.country, include_groups: "total,album,single" } }
                    );
                    break;

                case "Artist's Top Tracks":
                    // This endpoint
                    items = await Metadata.getMultipleTracks(
                        `/artists/${source.value}/top-tracks`,
                        { user, pagination: true, query: { market: user.country } }
                    );
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
                //     items = artists
                //     break;

                /**
                 * These cases are specifically for testing if a track, artist or album matches a playlist's filters.
                 * They are not visible in the UI, and hence are not specified in the descriptions.ts
                 */
                // @ts-ignore
                case "Track":
                    items = [await Metadata.getTrack(source.value)];
                    break;
                // @ts-ignore
                case "Album":
                    items = [await Metadata.getAlbum(source.value)];
                    break;
                // @ts-ignore
                case "Artist":
                    items = [await Metadata.getArtist(source.value)];
                    break;
            }

            filteritems.push(...items)
            task.log.sources.push(MusicSources.as_log(index, items.length, items[0]?.kind || "item"));
        }

        task.log.sources.push(`All given sources resulted in ${filteritems.length} items`);
        return filteritems;
    }

    private static as_log(index: number, count: number, kind: string) {
        return `Source ${index + 1} yielded ${count} ${kind}${count !== 1 ? "s" : ""}`;
    }
}