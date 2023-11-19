import { FilterItem, SAlbum, SArtist, STrack } from "../../shared/types/server";

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
 export async function get_by_kind<T extends STrack | SAlbum | SArtist>(
    item: FilterItem<T>,
    track: (item: FilterItem<T>) => Promise<FilterItem<T>[]>,
    album: (item: FilterItem<T>) => Promise<FilterItem<T>[]>,
    artist: (item: FilterItem<T>) => Promise<FilterItem<T>[]>,
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
 * Filters items based on the filter function in an asynchronous way. This function should only be used if the filter contains an await in order to process items.
 * @param items The items to filter
 * @param filter This receives an item from the given items, and requires that same item to be returned if the filter matches. If not returned, the item is discarded.
 * @returns the filtered items
 */
export async function filter_async<T extends STrack | SAlbum | SArtist>(
    input_items: FilterItem<T>[],
    getter: (item: FilterItem<T>) => Promise<FilterItem<T>[]>,
    filter: (item: FilterItem<T>) => Promise<FilterItem<T> | undefined>
){
    const matches: any[] = [];
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
                    matches.push(filter_item)
            }

            resolve(true);
        }));
    }

    // Wait for all promises to be resolved
    await Promise.all(tasks);
    return matches;
}
