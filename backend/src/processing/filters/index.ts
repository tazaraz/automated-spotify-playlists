import { ProcessLevel } from "..";
import { FilterItem, Generic } from "../../shared/types/server";
import FilterTask from "../../stores/filtertask";

export { Album } from "./album";
export { Artist } from "./artist";
export { Track } from "./track";
export { TrackFeatures } from "./track_features";

/**
 * Executes a function given the kind of the input item.
 * @param item The item on which the filter is being applied
 * @param track The function to execute if the item is a track
 * @param album The function to execute if the item is an album
 * @param artist The function to execute if the item is an artist
 * @returns Result from the according executed function
 */
export async function get_by_kind<T extends Generic>(
    item: FilterItem<Generic>,
    track: (item: FilterItem<Generic>) => Promise<FilterItem<T>[]>,
    album: (item: FilterItem<Generic>) => Promise<FilterItem<T>[]>,
    artist: (item: FilterItem<Generic>) => Promise<FilterItem<T>[]>,
) {
    switch (item.kind) {
        case "track":
            return await track(item);
        case "album":
            return await album(item);
        case "artist":
            return await artist(item);
        default:
            console.error(`get_by_kind: Unknown kind '${item}'`);
    }
}

/**
 * This function returns the item lowest in the hierarchical order. The order is as follows: `artist -> album -> track`.
 * @param item1 The first item to compare
 * @param item2 The second item to compare
 */
export async function lowest_kind(item1: FilterItem<Generic>, item2: FilterItem<Generic>) {
    // First try to return the track
    if (item1.kind == "track") return item1;
    if (item2.kind == "track") return item2;

    // Then try to return the album
    if (item1.kind == "album") return item1;
    if (item2.kind == "album") return item2;

    // Both are artists, return the first one
    return item1;
}

/**
 * Filters items based on the filter function in an asynchronous way. This function should only be used if the filter contains an await in order to process items.
 * @param items The items to filter
 * @param getter Converts an item to the target kind
 * @param filter This receives an item from the given items, and requires that same item to be returned if the filter matches. If not returned, the item is discarded.
 * @returns the filtered items
 */
export async function filter_async<T extends Generic>(
    input_items: FilterItem<Generic>[],
    getter: (item: FilterItem<Generic>) => Promise<FilterItem<T>[]>,
    filter: (filter_item: FilterItem<T>) => Promise<boolean | undefined>
){
    const matches: FilterItem<Generic>[] = [];
    const tasks = [];

    for (const input_item of input_items) {
        // Create a new promise for each item
        tasks.push(new Promise(async resolve => {
            // Execute the specified way how to get the items itself
            const filter_items = await getter(input_item)

            // Apply the filter and check if it should be appended
            for (const filter_item of filter_items) {
                const result = await filter(filter_item);

                if (result)
                    matches.push(await lowest_kind(input_item, filter_item))
            }

            resolve(true);
        }));
    }

    // Wait for all promises to be resolved
    await Promise.all(tasks);
    return matches;
}

/**
 * Logs extra data if the task's plevel is in info item mode.
 * Stuff like operation and filter name are known in the client, but this data is not.
 * @param task Task to log to
 * @param name Applicable name of the item being processed
 * @param data The data retrieved from Spotify (or the cache)
 * @param filter The filter that was matched
 */
export function log_single(task: FilterTask, name: string, data: string | number, filter: string | number) {
    if (task.plevel !== ProcessLevel.INFO_ITEM) return;
    task.log.filters.push(`Info:${name}:${filter}:${data}`)
}