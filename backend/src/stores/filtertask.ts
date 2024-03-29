import { FilterResult } from "../processing";
import { PlaylistLog } from "../shared/types/playlist";

/**
 * FilterTask allows storing logs, but adds a listener to the log to detect when it updates.
 */
export default class FilterTask {
    private static logs: { [playlist_id: string]: FilterTask } = {};

    // Playlist id
    playlist_id: string;
    // Promise resolve function
    logChangeResolver: ((value: FilterTask) => void) | undefined;

    // Contains the actual logs
    log: PlaylistLog;
    // Whether the log is finalized
    finalized = false;
    // Result of the task
    result: FilterResult;

    constructor(playlist_id: string, auto: boolean = false) {
        this.playlist_id = playlist_id;

        this.log = {
            name: `${new Date().toLocaleDateString()}-${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
            sources: [],
            filters: []
        }

        if (auto) this.log.name = '(auto) ' + this.log.name;

        // Store the log
        FilterTask.logs[playlist_id] = this;

        // Create a proxy
        for (const logtype of ['sources', 'filters']) {
            this.log[logtype] = new Proxy(this.log[logtype], {
                set: (target, property, value) => {
                    target[property] = value;

                    // On update, resolve the promise if it was created
                    if (this.logChangeResolver) {
                        this.logChangeResolver(this);
                        this.logChangeResolver = undefined
                    }

                    return true;
                },
            })
        }
    }

    /**
     * Returns a promise which resolves when the log changes.
     */
    async logChange() {
        if (this.finalized) {
            return this;
        }

        return new Promise<FilterTask>(resolve => { this.logChangeResolver = resolve; })
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
        if (this.logChangeResolver) this.logChangeResolver(this);

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