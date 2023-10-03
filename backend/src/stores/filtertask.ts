import { FilterResult } from "../processing";
import { Playlist } from "../shared/types/playlist";

/**
 * FilterTask allows storing logs, but adds a listener to the log to detect when it updates.
 */
export default class FilterTask {
    private static logs: { [playlist_id: string]: FilterTask } = {};

    // Playlist id
    playlist_id: string;
    // Promise resolve function
    resolve: ((value: FilterTask) => void) | undefined;
    // Contains the actual logs
    log: Playlist['log'];
    // Whether the log is finalized
    finalized = false;
    // Result of the task
    result: FilterResult;

    constructor(playlist_id: string) {
        this.playlist_id = playlist_id;

        this.log = {
            sources: [],
            filters: []
        }

        // Store the log
        FilterTask.logs[playlist_id] = this;

        // Create a proxy
        for (const logtype of ['sources', 'filters']) {
            this.log[logtype] = new Proxy(this.log[logtype], {
                set: (target, property, value) => {
                    target[property] = value;

                    // On update, resolve the promise if it was created
                    if (this.resolve) {
                        this.resolve(this);
                        this.resolve = undefined
                    }

                    return true;
                },
            })
        }
    }

    /**
     * Returns a promise which resolves when the log changes.
     */
    async stateChange() {
        if (this.finalized) {
            return this;
        }

        return new Promise<FilterTask>(resolve => { this.resolve = resolve; })
    }

    /**
     * Deletes the log.
     */
    delete() {
        delete FilterTask.logs[this.playlist_id];
    }

    /**
     * Returns the log and marks it for deletion. Will be deleted after 50 seconds if not deleted by the endpoint.
     */
    finalize(result: FilterResult) {
        this.result = result;
        this.finalized = true;
        // Finalize the last promise
        if (this.resolve) this.resolve(this);

        // Delete the log after 50 seconds
        setTimeout(() => this.delete(), 50000);
    }

    /**
     * Whether a log already exists for a playlist.
     * @param playlist_id Playlist ID
     */
    static exists(playlist_id: string) {
        return FilterTask.logs[playlist_id] !== undefined;
    }

    /**
     * Gets the playlist log.
     * @param playlist_id Playlist ID
     */
    static get(playlist_id: string) {
        return FilterTask.logs[playlist_id];
    }
}