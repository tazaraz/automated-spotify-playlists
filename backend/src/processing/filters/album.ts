import { FilterString, FilterValue } from "../matching";
import { FilterItem, SAlbum, SArtist } from "../../types/server";
import { filter_async, get_by_kind } from ".";

export class Album {
    private static async convert(item: FilterItem) {
        /**
         * This is the config required to usually get the correct data used in this parser
         */
        return await get_by_kind<SAlbum[]>(item,
            // Tracks have an album function to get the albums
            async () => [await item.album()],
            // Albums are on their own adequate
            async () => [item],
            // Artists have multiple albums
            async () => await item.albums(),
        )
    }

    static async Artists(items: FilterItem[],
                         operation: keyof typeof FilterString.operation,
                         filter: string,
                         dry_run=false){
        if (dry_run) {
            FilterString.matches(operation, filter, "")
            return [];
        }

        return await filter_async<SArtist>(
            items,
            (item: FilterItem) => get_by_kind<SArtist[]>(item,
                async () => await (await item.album()).artists(),
                async () => await item.artists(),
                async () => [],
            ),
            async item => {
                // Get the item album artists
                if (FilterString.matches(operation, filter, item.name))
                    return item;
            }
        )
    }

    static async Name(items: FilterItem[],
                      operation: keyof typeof FilterString.operation,
                      filter: string,
                      dry_run=false){
        if (dry_run) {
            FilterString.matches(operation, filter, "")
            return [];
        }

        return await filter_async(items, Album.convert, async item => {
            // Get the track album name
            if (FilterString.matches(operation, filter, item.name))
                return item;
        })
    }

    static async ReleaseDate(items: FilterItem[],
                             operation: keyof typeof FilterValue.operation,
                             filter: number,
                             dry_run=false){
        if (dry_run) {
            FilterValue.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, Album.convert, async item => {
            // Get the track album release date
            if (FilterValue.matches(operation, filter, item.release_date))
                    return item;
        })
    }

    static async TrackCount(items: FilterItem[],
                            operation: keyof typeof FilterValue.operation,
                            filter: number,
                            dry_run=false){
        if (dry_run) {
            FilterValue.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, Album.convert, async item => {
            // Get the track album total tracks
            if (FilterValue.matches(operation, filter, item.total_tracks))
                return item;
        })
    }

    static async Genres(items: FilterItem[],
                        operation: keyof typeof FilterString.operation,
                        filter: string,
                        dry_run=false){
        if (dry_run) {
            FilterString.matches(operation, filter, "")
            return [];
        }

        return await filter_async(items, Album.convert, async item => {
            // This is a new field, and might not exist yet
            if (!item.genres || item.genres.length > 0) return item;

            if (FilterString.matches(operation, filter, item.genres.toString()))
                return item;
        })
    }
}
