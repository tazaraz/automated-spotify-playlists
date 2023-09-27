interface Error {
    /** HTTP status code */
    status: number;
    /** custom description */
    message?: string;
    /** Time the error will be present on screen. 0 means indefinately */
    duration?: number | 0;
    /** Level of importance. Less important errors will not be stored */
    priority?: 1 | 2 | 3;
}

/**
 * Stores errors and displays them to the user
 */
export default class FetchError {
    static handler: (error: Error) => void;

    static errors: {
        [status: number]: Error;
    } = {}

    static create(error: Error) {
        // If there is a more important error with the same status code, ignore this one
        const priority = error.priority ?? 2
        if (this.errors[error.status] !== undefined && this.errors[error.status].priority! > priority)
            return;

        /** If we overwrite the error, clear the possible timeout */
        if (this.errors[error.status] !== undefined)
            clearTimeout(this.errors[error.status].duration!);

        // Store, creating defajlt important status code if not present
        error.priority = priority;
        this.errors[error.status] = error;

        FetchError.handler(error);

        if (error.duration !== 0) {
            this.errors[error.status].duration = setTimeout(() => {
                delete this.errors[error.status];
                FetchError.handler(error)
            }, error.duration ?? 7000);
        }
    }
}