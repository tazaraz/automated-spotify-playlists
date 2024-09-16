import { FilterResult, ProcessLevel } from "../processing";
import { PlaylistLog } from "../shared/types/playlist";

/**
 * FilterTask allows storing logs, but adds a listener to the log to detect when it updates.
 */
export default class FilterTask {
    private static logs: { [pid: string]: FilterTask } = {};

    /** Id of the task. Unique, so a task cannot be executed twice at the same time */
    private pid: string;
    // Promise resolve function
    private logChangeResolver: ((value: FilterTask) => void) | undefined;

    /** Contains the logs gathered while filtering */
    log: PlaylistLog;
    /** Result of the task */
    result: FilterResult;
    /** Level of the logs gathered and processing done */
    plevel: ProcessLevel;
    /** Whether the log is finalized */
    finalized = false;

    constructor(pid: string, level: ProcessLevel, auto: boolean = false) {
        this.pid = pid;
        this.plevel = level;
        this.log = {
            name: `${new Date().toLocaleDateString()}-${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}`,
            sources: [],
            filters: []
        }

        if (auto) this.log.name = '(auto) ' + this.log.name;

        // Store the log
        FilterTask.logs[pid] = this;

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
        // Delete the log
        delete FilterTask.logs[this.pid];
        // Unset the process ID
        this.pid = "";
    }

    /**
     * Returns the log and marks it for deletion. Will be deleted after 50 seconds if not deleted by the endpoint.
     */
    finalize(result: FilterResult) {
        this.result = result;
        this.finalized = true;
        // Finalize the last promise
        if (this.logChangeResolver) this.logChangeResolver(this);

        // Delete the log after 60 seconds
        setTimeout(() => {
            // If the pid still exists (log not deleted)
            if (this.pid !== "") this.delete()
        }, 60000);
    }

    /**
     * Whether a log already exists for a given ID.
     * @param id
     */
    static exists(id: string) {
        return FilterTask.logs[id] !== undefined;
    }

    /**
     * Gets the task log for a given ID.
     * @param id
     */
    static get(id: string) {
        return FilterTask.logs[id];
    }
}