import { FilterValue, FilterSlider } from "../../shared/matching";
import { FilterItem, Generic, SAlbum, SArtist, STrack } from "../../shared/types/server";
import { filter_async, get_by_kind } from ".";

export class TrackFeatures {
    private static async convert(item: FilterItem<Generic>) {
        return await get_by_kind<STrack>(item,
            // Albums are on their own adequate
            async () => [item as FilterItem<STrack>],
            // Albums can easily get all their tracks
            async () => (item as SAlbum).tracks(),
            /**This is the tricky and expensive one. Pray we use it as little as possible or that the items are
             * already cached.
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

    static async Acoustic(items: FilterItem<Generic>[],
                      operation: keyof typeof FilterSlider.operation,
                      filter: number,
                      dry_run=false){
        if (dry_run) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async filter_item => {
            if (FilterSlider.matches(operation, filter, (await filter_item.features()).acousticness * 100))
                return true;
        })
    }

    static async Danceability(items: FilterItem<Generic>[],
                              operation: keyof typeof FilterSlider.operation,
                              filter: number,
                              dry_run=false){
        if (dry_run) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async filter_item => {
            // Sliders on the client side range from 0 - 100, whereas the API ranges from 0.0 - 1.0
            if (FilterSlider.matches(operation, filter, (await filter_item.features()).danceability * 100))
                return true;
        })
    }

    static async Energy(items: FilterItem<Generic>[],
                        operation: keyof typeof FilterSlider.operation,
                        filter: number,
                        dry_run=false){
        if (dry_run) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async filter_item => {
            if (FilterSlider.matches(operation, filter, (await filter_item.features()).energy * 100))
                return true;
        })
    }

    static async Vocality(items: FilterItem<Generic>[],
                              operation: keyof typeof FilterSlider.operation,
                              filter: number,
                              dry_run=false){
        if (dry_run) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async filter_item => {
            // The UI displays this as 'Vocality', but the API calls it 'instrumentalness', which is the opposite
            if (FilterSlider.matches(operation, filter, (1 - (await filter_item.features()).instrumentalness) * 100))
                return true;
        })
    }

    static async Loudness(items: FilterItem<Generic>[],
                          operation: keyof typeof FilterValue.operation,
                          filter: number,
                          dry_run=false){
        if (dry_run) {
            FilterValue.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async filter_item => {
            if (FilterValue.matches(operation, filter, (await filter_item.features()).loudness * 100))
                return true;
        })
    }

    static async Live(items: FilterItem<Generic>[],
                      operation: keyof typeof FilterSlider.operation,
                      filter: number,
                      dry_run=false){
        if (dry_run) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async filter_item => {;
            if (FilterSlider.matches(operation, filter, (await filter_item.features()).liveness * 100))
                return true;
        })
    }

    static async BPM(items: FilterItem<Generic>[],
                       operation: keyof typeof FilterValue.operation,
                       filter: number,
                       dry_run=false){
        if (dry_run) {
            FilterValue.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async filter_item => {
            if (FilterValue.matches(operation, filter, (await filter_item.features()).tempo))
                return true;
        })
    }

    static async Positivity(items: FilterItem<Generic>[],
                            operation: keyof typeof FilterSlider.operation,
                            filter: number,
                            dry_run=false){
        if (dry_run) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async filter_item => {
            // Sliders on the client side range from 0 - 100, whereas the API ranges from 0.0 - 1.0
            if (FilterSlider.matches(operation, filter, (await filter_item.features()).valence * 100))
                return true;
        })
    }
}