import { Playlist } from "../types/playlist";

/**
 * FilterLog allows storing logs, but adds a listener to the log to detect when it updates.
 */
export default class FilterLog {
    private static logs: { [playlist_id: string]: FilterLog } = {};

    // Contains the actual logs
    log: Playlist['log'];
    // Playlist id
    playlist_id: string;
    // Proxy handlers
    sources: string[];
    filters: string[];
    // Promise resolve function
    resolve: ((value: Playlist['log']) => void) | undefined;

    constructor(playlist_id: string) {
        this.playlist_id = playlist_id;

        this.log = {
            sources: [],
            filters: []
        }

        // Create a proxy
        for (const log of ['sources', 'filters']) {
            this[log] = new Proxy(this.log[log], {
                set: (target, property, value) => {
                    target[property] = value;

                    // On update, resolve the promise if it was created
                    if (this.resolve) {
                        this.resolve(this.log);
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
    changed() {
        return new Promise<Playlist['log']>(resolve => { this.resolve = resolve; })
    }

    /**
     * Returns the log and deletes the log from the store
     */
    finalize() {
        const log = JSON.parse(JSON.stringify(this.log));
        delete FilterLog.logs[this.playlist_id];
        return log as Playlist['log'];
    }

    /**
     * Whether a log already exists for a playlist.
     * @param playlist_id Playlist ID
     */
    static exists(playlist_id: string) {
        return FilterLog.logs[playlist_id] !== undefined;
    }

    /**
     * Gets the playlist log.
     * @param playlist_id Playlist ID
     */
    static get(playlist_id: string) {
        return FilterLog.logs[playlist_id];
    }
}