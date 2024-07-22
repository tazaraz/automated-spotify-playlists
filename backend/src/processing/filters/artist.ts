import { FilterString, FilterValue } from "../../shared/matching";
import { FilterItem, Generic, SAlbum, SArtist, STrack } from "../../shared/types/server";
import { filter_async, get_by_kind, log_single } from ".";
import { ProcessLevel } from "..";
import FilterTask from "../../stores/filtertask";

export class Artist {
    static async convert(item: FilterItem<Generic>){
        /**
         * This is the config required to usually get the correct data used in this parser
         */
        return await get_by_kind<SArtist>(item,
            // Tracks have an artists function to get the artists
            async () => await (item as STrack).artists(),
            // Tracks have an artists function to get the artists
            async () => await (item as SAlbum).artists(),
            // Artists are on their own adequate
            async () => [item as FilterItem<SArtist>],
        )
    }

    static async Name(items: FilterItem<Generic>[],
                      operation: keyof typeof FilterString.operation,
                      filter: string,
                      task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterString.matches(operation, filter, "")
            return [];
        }

        return await filter_async(items, Artist.convert, async filter_item => {
            log_single(task, filter_item.name, filter, filter_item.name)

            // Get the artist names
            if (FilterString.matches(operation, filter, filter_item.name))
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

        return await filter_async(items, Artist.convert, async filter_item => {
            log_single(task, filter_item.name, filter, filter_item.genres.toString())

            // Get the track artists
            if (FilterString.matches(operation, filter, filter_item.genres.toString()))
                return true;
        })
    }

    static async Popularity(items: FilterItem<SArtist>[],
                            operation: keyof typeof FilterValue.operation,
                            filter: number,
                            task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterValue.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, Artist.convert, async filter_item => {
            log_single(task, filter_item.name, filter, filter_item.popularity)

            // Popularity ranges from 0 - 100
            if (FilterValue.matches(operation, filter, filter_item.popularity / 100))
                return true;
        })
    }

    static async Followers(items: FilterItem<SArtist>[],
                           operation: keyof typeof FilterValue.operation,
                           filter: number,
                           task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterValue.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, Artist.convert, async filter_item => {
            log_single(task, filter_item.name, filter, filter_item.followers)

            // Get the track artists
            if (FilterValue.matches(operation, filter, filter_item.followers))
                return true;
        })
    }
}
