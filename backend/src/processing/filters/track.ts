import { FilterSlider, FilterString, FilterValue } from "../../shared/matching";
import { FilterItem, STrack } from "../../shared/types/server";
import { filter_async, get_by_kind } from ".";

export class Track {
    /**
     * This is the only non-private function, used in filtering.ts as well.
     * @param item Converts a FilterItem into a STrack
     * @returns track
     */
    static async convert(item: FilterItem<any>) {
        return await get_by_kind<STrack>(item,
            // Albums are on their own adequate
            async () => [item],
            // Albums can easily get all their tracks
            async () => item.tracks(),
            /**This is the tricky and expensive one. Pray we the items are already cached.
             * By converting an artist to their tracks, we get a 2D array:
             * * artist -> [album, album, ...] -> [[track, track, ...], [track, track, ...], ...] */
            // Concat merges a 2D array into a 1D one.
            async () => ([] as FilterItem<STrack>[]).concat(
                /**We can await the first step with a simple 'await', but from albums to tracks we get a
                 * Promise<STrack>[], thus requiring a Promise.all(...)*/
                ...await Promise.all(
                    (await item.albums()).map(async album => await album.tracks())
                )
            ),
        )
    }

    static async Name(items: FilterItem<STrack>[],
                      operation: keyof typeof FilterString.operation,
                      filter: string,
                      dry_run=false){
        if (dry_run) {
            FilterString.matches(operation, filter, "")
            return [];
        }

        return await filter_async(items, Track.convert, async item => {
            if (FilterString.matches(operation, filter, item.name))
                return item
        })
    }

    static async Popularity(items: FilterItem<STrack>[],
                            operation: keyof typeof FilterSlider.operation,
                            filter: number,
                            dry_run=false){
        if (dry_run) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, Track.convert, async item => {
            // Popularity ranges from 0 - 100
            if (FilterSlider.matches(operation, filter, item.popularity))
                return item;
        })
    }

    static async Duration(items: FilterItem<STrack>[],
                          operation: keyof typeof FilterValue.operation,
                          filter: number,
                          dry_run=false){
        if (dry_run) {
            FilterValue.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, Track.convert, async item => {
            // Convert milliseconds to seconds
            if (FilterValue.matches(operation, filter, item.duration_ms / 1000))
                return item;
        })
    }
}
