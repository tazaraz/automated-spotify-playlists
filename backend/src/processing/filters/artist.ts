import { FilterString, FilterValue } from "../matching";
import { FilterItem, SAlbum, SArtist, STrack } from "../../types/server";
import { filter_async, get_by_kind } from ".";

export class Artist {
    private static async convert(item: FilterItem){
        /**
         * This is the config required to usually get the correct data used in this parser
         */
        return await get_by_kind<SArtist[]>(item,
            // Tracks have an artists function to get the artists
            async () => await (item as STrack).artists(),
            // Tracks have an artists function to get the artists
            async () => await (item as SAlbum).artists(),
            // Artists are on their own adequate
            async () => [item],
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

        return await filter_async(items, Artist.convert, async item => {
            // Get the artist names
            if (FilterString.matches(operation, filter, item.name))
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

        return await filter_async(items, Artist.convert, async item => {
            // Get the track artists
            if (FilterString.matches(operation, filter, item.genres.toString()))
                return item;
        })
    }

    static async Popularity(items: FilterItem[],
                            operation: keyof typeof FilterValue.operation,
                            filter: number,
                            dry_run=false){
        if (dry_run) {
            FilterValue.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, Artist.convert, async item => {
            // Popularity ranges from 0 - 100
            if (FilterValue.matches(operation, filter, item.popularity / 100))
                return item;
        })
    }

    static async Followers(items: FilterItem[],
                           operation: keyof typeof FilterValue.operation,
                           filter: number,
                           dry_run=false){
        if (dry_run) {
            FilterValue.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, Artist.convert, async item => {
            // Get the track artists
            if (FilterValue.matches(operation, filter, item.followers))
                return item;
        })
    }
}
