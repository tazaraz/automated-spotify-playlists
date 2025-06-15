import { Store, Pinia } from "pinia-class-component";

interface LayoutView<T> {
    /** The minimum width the view can be */
    min: number;
    /** The maximum width the view can be */
    max: number;
    /** The actual width of the view */
    width: number;
    /** The width the user wants the view to be */
    user: number;
    /** The current state of the view */
    state: T;
    breakpoints: { [width: number]: {
        /** The state to which this belongs */
        state: T,
        /** The width to snap to */
        snapTo?: number,
        /** Whether to use this breakpoint on mobile */
        mobile?: boolean
    }};
}

/**
 * Represents an error that will be displayed to the user
 */
export interface LayoutError {
    /** HTTP status code */
    status: number;
    /** Title */
    title?: string;
    /** custom description */
    message?: string;
    /** Time (ms) the error will be present on screen. 0 means indefinately */
    duration?: number;
    /** Level of importance. Less important errors will not be stored */
    priority?: number;
}


@Store
export default class Layout extends Pinia {
    /** Copilot implementation of nextTick. Seems to work */
    nextTick: () => Promise<void> = () => new Promise((resolve: any) => requestAnimationFrame(resolve));

    sidebar: LayoutView<'tiny' | 'normal'> = {
        min: 7*16,
        max: 500,
        width: 400,
        user: 400,
        state: 'normal' as 'tiny' | 'normal',
        breakpoints: {
            300: { state: 'tiny', snapTo: 7*16, mobile: false },
            999999: { state: 'normal' }
        }
    }
    main: LayoutView<'small' | 'normal' | 'large'> = {
        min: 460,
        max: Infinity,
        width: 460,
        user: 460,
        state: 'normal',
        breakpoints: {
            640: { state: 'small' },
            840: { state: 'normal' },
            999999: { state: 'large' },
        }
    }
    editor: LayoutView<'none' | 'small' | 'normal' | 'large'> = {
        min: 440,
        max: 1200,
        width: 0,
        user: 400,
        state: 'none',
        breakpoints: {
            560: { state: 'small' },
            800: { state: 'normal' },
            999999: { state: 'large' },
        }
    }

    app = {
        padding: 16,
        handleWidth: 12,
        mobile: false,
        mobileBreakpoint: 640,
        grid: {
            columns: '',
            rows: ''
        }
    }

    /** Stores errors. Sorted on priority */
    error: LayoutError[] = [];

    constructor() {
        super();
        this.updateLayout();
    }

    async resize(view: 'sidebar' | 'editor', event: TouchEvent | MouseEvent) {
        await this.calculateGridFor(view, event, true);
        await this.resolveConflicts(view);
    }

    /**
     * Resolve min max conflicts between the views
     * @param userResizing Whether the user is resizing the view
     */
    async resolveConflicts(view: 'sidebar' | 'editor' | 'none' = 'none') {
        this.app.mobile = window.innerWidth < this.app.mobileBreakpoint;

        // Update the width of the sidebar and main views
        this.sidebar.width  = this.updateView('sidebar', document.getElementById('sidebar')!.clientWidth);
        this.main.width     = this.updateView('main', document.getElementsByTagName('main')![0].clientWidth);
        if (this.editor.state !== 'none')
            this.editor.width = this.updateView('editor', document.getElementById('editor')!.clientWidth);

        // None of the bars / views logic applies to mobile
        if (!this.app.mobile) {
            // If there is not enough space for the editor view, resize the main view
            if ((this.editor.width < this.editor.min || this.editor.width < this.editor.user)
                && view !== 'editor'
                && this.editor.state !== 'none') {
                await this.calculateGridFor(
                    'editor',
                    { clientX: window.innerWidth - this.editor.user } as MouseEvent,
                    false
                );
            }

            // If there is not enough space for the main view, resize the sidebar
            if ((this.main.width < this.main.min || this.sidebar.width < this.sidebar.user)
                && view !== 'sidebar') {
                await this.calculateGridFor(
                    'sidebar',
                    { clientX: this.sidebar.width - (this.main.min - this.main.user)
                                                  + (this.app.padding + 3) * 2         // Weird offset shenanigans
                    } as MouseEvent,
                    false
                );
            }
        }

        this.updateLayout();
    }

    async calculateGridFor(view: 'sidebar' | 'editor', event: TouchEvent | MouseEvent, isUser: boolean) {
        // Prevent text selection
        window.getSelection()?.removeAllRanges();

        const rect = document.getElementById(view)!.getBoundingClientRect();
        const elStart = view === 'sidebar' ? rect.left : rect.right;

        // Get the clientX
        let clientX: string | number = 'touches' in event ? event.touches[0].clientX : event.clientX;

        // Calculate the actual clientX
        clientX += this.app.handleWidth / 2;
        clientX -= elStart;
        // Depending on what view we're resizing, we need to nudge the clientX a bit to overlap with the handle
        clientX = view === 'sidebar' ? clientX - this.app.padding + 3: -clientX;

        // Save it as the user's desired width
        if (isUser) this[view].user = clientX;

        // Limit the views with to both its own minimum and maximum
        let targetWidth = Math.abs(Math.max(this[view].min, Math.min(this[view].max, clientX)));

        /** Stupidly importand code. Took waaaay to long. Enforces main view minimum width
         * Limit current changing view to not exceed the main view's minimum width if:
         *   - We are changing the sidebar
         *   - We are changing the editor and the sidebar is tiny (as small as it can be) */
        if (this.main.width + (this[view].width - targetWidth) <= this.main.min &&
            (view == "sidebar" || (view == "editor" && this.sidebar.state === 'tiny'))) {
            targetWidth = this[view].width - (this.main.min - this.main.width);
        }

        // Update the width of the view
        this[view].width = this.updateView(view, targetWidth);

        // Update the grid itself
        this.updateLayout();

        // Wait for the next tick to update the view's width
        await this.nextTick();
        this.main.width = this.updateView('main', document.getElementsByTagName('main')![0].clientWidth);
    }

    /**
     * Update the views' state based on the width of the view, and returns the new width of the view
     * @param view Which view to update
     * @param width The new width of the view
     * @returns The new width of the view, clipped to a breakpoint if necessary
     */
    updateView(view: 'main' | 'sidebar' | 'editor', width: number) {
        // Check if the clientX is within a breakpoint
        for (const b in this[view].breakpoints) {
            // Parse the breakpoint. Cast as any to avoid TS errors later
            const breakpoint = parseInt(b) as any;

            // If the width is less than the breakpoint
            if (width <= parseInt(breakpoint)) {
                // If the breakpoint is disabled on mobile
                if (this[view].breakpoints[breakpoint].mobile === false && this.app.mobile)
                    continue;

                // Update the current state
                this[view].state = this[view].breakpoints[breakpoint].state;

                // This is meant to clip the width of the sidebar to a certain width
                if (this[view].breakpoints[breakpoint].snapTo)
                    return this[view].breakpoints[breakpoint].snapTo || width;

                break;
            }
        }

        return width;
    }

    async showEditor(state: boolean) {
        // Toggle the editor's state
        this.editor.state = state ? 'normal' : 'none';
        this.editor.width = state ? this.editor.user : 0;
        // Wait for the DOM to update
        await this.nextTick();
        // Resolve conflicts
        this.resolveConflicts();
    }

    /** Creates the string which governs the columns of the app grid */
    updateLayout() {
        if (this.app.mobile) {
            this.app.padding = 0;
            this.app.grid.columns = '1fr';
            this.app.grid.rows = 'min-content 1fr 4rem';

        } else {
            this.app.padding = 16;
            this.app.grid.columns = `${this.sidebar.width}px ${this.app.handleWidth}px 1fr ${this.app.handleWidth}px ${this.editor.width}px`;
            this.app.grid.rows = '4rem min-content 1fr';
        }
    }

    /**
     * Creates an error notification in the layout. Should also be exported to
     * `Fetch.createError` for static access
     * @param error The error to display
     */
    createError(error: LayoutError) {
        const currentError = this.error[0]
        error.priority = error.priority ?? 0;

        // If such an error already exists, replace it
        if (currentError &&
            currentError.status === error.status &&
            currentError.title == error.title) {
            // Overwrite the error
            this.error[0] = error;
            this.error[0].duration = setTimeout(() => {
                this.error.shift();
            }, error.duration || 7000) as any;
            // Stop the old timeout
            clearTimeout(currentError.duration!);
        }

        // Add the error to the list
        else {
            // Add the error to the list and get index
            const index = this.error.push(error) - 1;
            error.duration = setTimeout(() => {
                this.error.splice(index, 1);
            }, error.duration || 10000) as any;

            // Sort the array based on priority
            this.error.sort((a, b) => a.priority! - b.priority!);
        }
    }
}