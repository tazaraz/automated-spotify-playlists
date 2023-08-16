import { FilterValue, FilterSlider, FilterBoolean } from "../matching";
import { FilterItem, STrack } from "../../types/server";
import { filter_async, get_by_kind } from ".";

export class TrackFeatures {
    private static async convert(item: FilterItem) {
        return await get_by_kind<STrack[]>(item,
            // Albums are on their own adequate
            async () => [item],
            // Albums can easily get all their tracks
            async () => item.tracks(),
            /**This is the tricky and expensive one. Pray we use it as little as possible or that the items are
             * already cached.
             * By converting an artist to their tracks, we get a 2D array:
             * * artist -> [album, album, ...] -> [[track, track, ...], [track, track, ...], ...] */
            // Concat merges a 2D array into a 1D one.
            async () => ([] as STrack[]).concat(
                /**We can await the first step with a simple 'await', but from albums to tracks we get a
                 * Promise<STrack>[], thus requiring a Promise.all(...)*/
                ...await Promise.all(
                    (await item.albums()).map(async album => await album.tracks())
                )
            ),
        )
    }

    static async Acoustic(items: FilterItem[],
                      operation: keyof typeof FilterSlider.operation,
                      filter: number,
                      dry_run=false){
        if (dry_run) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async item => {
            // 0.8 I just made up
            if (FilterSlider.matches(operation, filter, (await item.features()).acousticness * 100))
                return item;
        })
    }

    static async Danceability(items: FilterItem[],
                              operation: keyof typeof FilterSlider.operation,
                              filter: number,
                              dry_run=false){
        if (dry_run) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async item => {
            // Sliders on the client side range from 0 - 100, whereas the API ranges from 0.0 - 1.0
            if (FilterSlider.matches(operation, filter, (await item.features()).danceability))
                return item;
        })
    }

    static async Energy(items: FilterItem[],
                        operation: keyof typeof FilterSlider.operation,
                        filter: number,
                        dry_run=false){
        if (dry_run) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async item => {
            if (FilterSlider.matches(operation, filter, (await item.features()).energy))
                return item;
        })
    }

    static async Vocality(items: FilterItem[],
                              operation: keyof typeof FilterSlider.operation,
                              filter: number,
                              dry_run=false){
        if (dry_run) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async item => {
            if (FilterSlider.matches(operation, filter, (await item.features()).instrumentalness * 100))
                return item;
        })
    }

    static async Loudness(items: FilterItem[],
                          operation: keyof typeof FilterValue.operation,
                          filter: number,
                          dry_run=false){
        if (dry_run) {
            FilterValue.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async item => {
            if (FilterValue.matches(operation, filter, (await item.features()).loudness))
                return item;
        })
    }

    static async Live(items: FilterItem[],
                      operation: keyof typeof FilterSlider.operation,
                      filter: number,
                      dry_run=false){
        if (dry_run) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async item => {;
            if (FilterSlider.matches(operation, filter, (await item.features()).liveness * 100))
                return item;
        })
    }

    static async BPM(items: FilterItem[],
                       operation: keyof typeof FilterValue.operation,
                       filter: number,
                       dry_run=false){
        if (dry_run) {
            FilterValue.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async item => {
            if (FilterValue.matches(operation, filter, (await item.features()).tempo))
                return item;
        })
    }

    static async Positivity(items: FilterItem[],
                            operation: keyof typeof FilterSlider.operation,
                            filter: number,
                            dry_run=false){
        if (dry_run) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async item => {
            // Sliders on the client side range from 0 - 100, whereas the API ranges from 0.0 - 1.0
            if (FilterSlider.matches(operation, filter, (await item.features()).valence))
                return item;
        })
    }
}