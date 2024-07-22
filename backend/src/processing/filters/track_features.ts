import { FilterValue, FilterSlider } from "../../shared/matching";
import { FilterItem, Generic, SAlbum, SArtist, STrack } from "../../shared/types/server";
import { filter_async, get_by_kind, log_single } from ".";
import { ProcessLevel } from "..";
import FilterTask from "../../stores/filtertask";

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
                          task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async filter_item => {
            const features = await filter_item.features();
            if (features == undefined || features == null) return false;

            const acousticness = features.acousticness * 100;
            log_single(task, filter_item.name, filter, acousticness)

            if (FilterSlider.matches(operation, filter, acousticness))
                return true;
        })
    }

    static async Danceability(items: FilterItem<Generic>[],
                              operation: keyof typeof FilterSlider.operation,
                              filter: number,
                              task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async filter_item => {
            const features = await filter_item.features();
            if (features == undefined || features == null) return false;

            const danceability = features.danceability * 100;
            log_single(task, filter_item.name, filter, danceability)

            // Sliders on the client side range from 0 - 100, whereas the API ranges from 0.0 - 1.0
            if (FilterSlider.matches(operation, filter, danceability))
                return true;
        })
    }

    static async Energy(items: FilterItem<Generic>[],
                        operation: keyof typeof FilterSlider.operation,
                        filter: number,
                        task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async filter_item => {
            const features = await filter_item.features();
            if (features == undefined || features == null) return false;

            const energy = features.energy * 100;
            log_single(task, filter_item.name, filter, energy)

            if (FilterSlider.matches(operation, filter, energy))
                return true;
        })
    }

    static async Vocality(items: FilterItem<Generic>[],
                          operation: keyof typeof FilterSlider.operation,
                          filter: number,
                          task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async filter_item => {
            const features = await filter_item.features();
            if (features == undefined || features == null) return false;

            const instrumentalness = (1 - features.instrumentalness) * 100;
            log_single(task, filter_item.name, filter, instrumentalness)

            // The UI displays this as 'Vocality', but the API calls it 'instrumentalness', which is the opposite
            if (FilterSlider.matches(operation, filter, instrumentalness))
                return true;
        })
    }

    static async Loudness(items: FilterItem<Generic>[],
                          operation: keyof typeof FilterValue.operation,
                          filter: number,
                          task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterValue.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async filter_item => {
            const features = await filter_item.features();
            if (features == undefined || features == null) return false;

            const liveness = features.liveness * 100;
            log_single(task, filter_item.name, filter, liveness)

            if (FilterValue.matches(operation, filter, liveness))
                return true;
        })
    }

    static async Live(items: FilterItem<Generic>[],
                      operation: keyof typeof FilterSlider.operation,
                      filter: number,
                      task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async filter_item => {
            const features = await filter_item.features();
            if (features == undefined || features == null) return false;

            const liveness = features.liveness * 100;
            log_single(task, filter_item.name, filter, liveness)

            if (FilterSlider.matches(operation, filter, liveness))
                return true;
        })
    }

    static async BPM(items: FilterItem<Generic>[],
                     operation: keyof typeof FilterValue.operation,
                     filter: number,
                     task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterValue.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async filter_item => {
            const features = await filter_item.features();
            if (features == undefined || features == null) return false;

            const tempo = features.tempo;
            log_single(task, filter_item.name, filter, tempo)

            if (FilterValue.matches(operation, filter, tempo))
                return true;
        })
    }

    static async Positivity(items: FilterItem<Generic>[],
                            operation: keyof typeof FilterSlider.operation,
                            filter: number,
                            task: FilterTask){
        if (task.plevel == ProcessLevel.DRY_RUN) {
            FilterSlider.matches(operation, filter, 0)
            return [];
        }

        return await filter_async(items, TrackFeatures.convert, async filter_item => {
            const features = await filter_item.features();
            if (features == undefined || features == null) return false;

            const valence = features.valence * 100;
            log_single(task, filter_item.name, filter, valence)

            // Sliders on the client side range from 0 - 100, whereas the API ranges from 0.0 - 1.0
            if (FilterSlider.matches(operation, filter, valence))
                return true;
        })
    }
}