import { FilterString, FilterValue } from "../../shared/matching";
import { FilterItem, Generic, SAlbum, SArtist, STrack } from "../../shared/types/server";
import { filter_async, get_by_kind, log_single as log_info_item } from ".";
import { ProcessLevel } from "..";
import FilterTask from "../../stores/filtertask";

export class Album {
    static async convert(item: FilterItem<Generic>) {
        /**
         * This is the config required to usually get the correct data used in this parser
         */
        return await get_by_kind<SAlbum>(item,
            // Tracks have an album function to get the albums
            async () => [await (item as STrack).album()],
            // Albums are on their own adequate
            async () => [item as FilterItem<SAlbum>],
            // Artists have multiple albums
            async () => await (item as SArtist).albums(),
        )
    }

    static async Artists(items: FilterItem<Generic>[],
                         operation: keyof typeof FilterString.operation,
                         filter: string,
                         task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterString.matches(operation, filter, "")
            return [];
        }

        return await filter_async(items, Album.convert, async filter_item => {
            // Get the item album artists
            for (const artist of await filter_item.artists()) {
                log_info_item(task, filter, artist.name)

                if (FilterString.matches(operation, filter, artist.name))
                    return true;
            }
        })
    }

    static async Name(items: FilterItem<Generic>[],
                      operation: keyof typeof FilterString.operation,
                      filter: string,
                      task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterString.matches(operation, filter, "")
            return [];
        }

        return await filter_async(items, Album.convert, async filter_item => {
            log_info_item(task, filter, filter_item.name)

            // Get the track album name
            if (FilterString.matches(operation, filter, filter_item.name))
                return true;
        })
    }

    static async ReleaseDate(items: FilterItem<Generic>[],
                             operation: keyof typeof FilterValue.operation,
                             filter: number,
                             task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterValue.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, Album.convert, async filter_item => {
            log_info_item(task, filter, filter_item.release_date)

            // Get the track album release date
            if (FilterValue.matches(operation, filter, filter_item.release_date))
                return true;
        })
    }

    static async TrackCount(items: FilterItem<Generic>[],
                            operation: keyof typeof FilterValue.operation,
                            filter: number,
                            task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterValue.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, Album.convert, async filter_item => {
            log_info_item(task, filter, filter_item.total_tracks)

            // Get the track album total tracks
            if (FilterValue.matches(operation, filter, filter_item.total_tracks))
                return true;
        })
    }

    static async Genres(items: FilterItem<Generic>[],
                        operation: keyof typeof FilterString.operation,
                        filter: string,
                        task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterString.matches(operation, filter, "")
            return [];
        }

        return await filter_async(items, Album.convert, async filter_item => {
            // Get all artists genres
            const artists = await Promise.all(await filter_item.artists());
            const genres  = artists.map(a => a.genres).flat().join(", ");

            log_info_item(task, filter, genres)
            if (!genres || genres.length == 0) return;
            if (FilterString.matches(operation, filter, genres))
                return true;
        })
    }

    static async Popularity(items: FilterItem<Generic>[],
                            operation: keyof typeof FilterValue.operation,
                            filter: number,
                            task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterValue.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, Album.convert, async filter_item => {
            log_info_item(task, filter, filter_item.popularity)

            if (FilterValue.matches(operation, filter, filter_item.popularity))
                return true;
        })
    }
}
