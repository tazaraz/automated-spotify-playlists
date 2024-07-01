import { FilterSlider, FilterString, FilterValue } from "../../shared/matching";
import { FilterItem, Generic, SAlbum, SArtist, STrack } from "../../shared/types/server";
import { filter_async, get_by_kind, log_single } from ".";
import { ProcessLevel } from "..";
import FilterTask from "../../stores/filtertask";

export class Track {
    /**
     * This is the only non-private function, used in filtering.ts as well.
     * @param item Converts a FilterItem into a STrack
     * @returns track
     */
    static async convert(item: FilterItem<Generic>) {
        return await get_by_kind<STrack>(item,
            // Albums are on their own adequate
            async () => [item as FilterItem<STrack>],
            // Albums can easily get all their tracks
            async () => (item as SAlbum).tracks(),
            /**This is the tricky and expensive one. Pray we the items are already cached.
             * By converting an artist to their tracks, we get a 2D array:
             * * artist -> [album, album, ...] -> [[track, track, ...], [track, track, ...], ...] */
            // Concat merges a 2D array into a 1D one.
            async () => [].concat(
                /**We can await the first step with a simple 'await', but from albums to tracks we get a
                 * Promise<STrack>[], thus requiring a Promise.all(...)*/
                ...await Promise.all(
                    (await (item as SArtist).albums()).map(async album => await album.tracks())
                )
            ),
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

        return await filter_async(items, Track.convert, async filter_item => {
            log_single(task, filter, filter_item.name)

            if (FilterString.matches(operation, filter, filter_item.name))
                return true;
        })
    }

    static async Popularity(items: FilterItem<Generic>[],
                            operation: keyof typeof FilterSlider.operation,
                            filter: number,
                            task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, Track.convert, async filter_item => {
            log_single(task, filter, filter_item.popularity)

            // Popularity ranges from 0 - 100
            if (FilterSlider.matches(operation, filter, filter_item.popularity))
                return true;
        })
    }

    static async Duration(items: FilterItem<Generic>[],
                          operation: keyof typeof FilterValue.operation,
                          filter: number,
                          task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterValue.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, Track.convert, async filter_item => {
            log_single(task, filter, filter_item.duration_ms / 1000)

            // Convert milliseconds to seconds
            if (FilterValue.matches(operation, filter, filter_item.duration_ms / 1000))
                return true;
        })
    }
}
