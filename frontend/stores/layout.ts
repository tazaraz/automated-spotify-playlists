import { Store, Pinia } from "pinia-class-component";

/**
 * --------------------------------
 *          READ ME FIRST
 * --------------------------------
 *
 * This is the main layout of the app. It does two things, one simple and one:
 *  - simple: It shuffles elements around: if the user is editing or the screen is too small
 *  - complex: It resizes the sidebar and edit view
 *
 * I'll explain the complex one. Below there are 3 variables/views: main, sidebar and edit. These dictate the
 * breakpoints for each possible view. For example, if the sidebar is smaller than edit.tiny.max, the sidebar
 * should be tiny, otherwise it will be something else .
 *
 * These breakpoints, recognizable by the 'CSS.' in the comments are used to set the state of these views using a
 * custom attribute containing the name of the view. Through this you can add a breakpoint using a simple syntax.
 *
 * Here 'view' refers to main, sidebar, or edit. 'CSS' refers to a breakpoint with a comment containing 'CSS.'
 * Syntax: <Element data-(view)-class="(CSS)-(classname)"></Element>
 *
 * Example: <Element data-sidebar-class="tiny-d-flex normal-d-none"></Element>
 * Will be when tiny: <Element class="d-flex" data-sidebar-class="tiny-d-flex normal-d-none"></Element>
 * Will be when normal: <Element class="d-none" data-sidebar-class="tiny-d-flex normal-d-none"></Element>
 * Will be when large: <Element class="" data-sidebar-class="tiny-d-flex normal-d-none"></Element>
 */

@Store
export default class Layout extends Pinia {
    /* Supplied in default.vue layout */
    nextTick!: () => Promise<void>;
    mainElement!: HTMLElement;
    appElement!: HTMLElement;
    playlistEditing = false;

    private mainQueryList!: NodeListOf<Element>;
    private sidebarQueryList!: NodeListOf<Element>;
    private editQueryList!: NodeListOf<Element>;

    /**
     * Definitions of the views
     */

    app = {
        /** Between these values the app should behave like a mobile app */
        mobile: 638,
        /** The width of a handle */
        handle_size: 12,
        /** Padding of the main view */
        padding: 2*16,
        /** Current width of the app */
        width: 0,
    }

    /** Dictates the behavior of the main container
     * Attibute: data-main-class=""
    */
    main = {
        /** Current state */
        state: 'normal',
        /** The allowed size of the main view */
        size: { min: 460 },
        /** CSS. When the main view should try to be small */
        tiny: { max: 40*16 },
        /** CSS. If in between this range */
        normal: { min: 40*16, max: 52*16 },
        /** CSS. If neither of the above are true */
        large: {}
    }

    /** Dictates the behavior of the sidebar container.
     * Attibute: data-sidebar-class=""
    */
    sidebar = {
        /** Width of the sidebar the user specified */
        user: 340,
        /** Actual width */
        width: 340,
        /** Current state */
        state: 'normal',
        /** Allowed size of the sidebar */
        size: { min: 6.5*16, max: 22*16 },
        /** Whether the sidebar view is being resized */
        resizing: false,
        /** CSS. Handle between these values, the sidebar should be small */
        tiny: { min: 0, max: 17*16 },
        /** CSS. Handle over this value, the sidebar should be normal */
        normal: { min: 17*16 },
    }

    /** Dictates the behavior of the edit container
     * Attibute: data-edit-class=""
    */
    edit = {
        /** Width the user specified. 0 meaning it will be calculated upon first opening */
        user: 0,
        /** Actual width. 0 meaning it will be calculated upon opening */
        width: 0,
        /** Current state */
        state: 'normal',
        /** Whether the edit view is being resized */
        resizing: false,
        /** Allowed size of the edit view */
        size: { min: 5*16 },
        /** CSS. Handle less than this, edit view should be full */
        full: { min: this.main.size.min },
        /* CSS. */
        large: { min: 50*16 },
        /* CSS. */
        normal: { min: 35*16 },
        /* CSS. */
        small: { },
        /** CSS. Seen from the right side. 0 meaning most right possible */
        tiny: { min: 0, max: 27*16 },
    }

    async render(user: TouchEvent | MouseEvent | number | null = null, force = false) {
        /** If we are on mobile */
        if (window.innerWidth <= this.app.mobile) {
            this.setMobile();
        } else if (this.sidebar.resizing || this.edit.resizing || force) {
            await this.nextTick();
            let clientX: number | null = null;

            /** Get the clientX (or don't) */
            if (user != null) {
                if ((user as any).preventDefault != undefined) {
                    (user as any).preventDefault();
                    clientX = ((user as any).touches ? (user as any).touches[0] : user).clientX;
                } else {
                    clientX = user as number;
                }
            }

            /** Update the view */
            this.mainElement = document.getElementById('main-view')!.getElementsByTagName('article')[0] as HTMLElement;
            /** Prevent text selection */
            window.getSelection()?.removeAllRanges();

            /** Update the classes associated with the main view */
            this.resizeMain(this.mainElement.clientWidth, force)

            /** If editing, check if we need to resize */
            if (this.playlistEditing) {
                await this.resizeEdit(
                    clientX ?? this.edit.user,
                    this.mainElement.clientWidth,
                    user != null,
                    force
                );
            } else {
                await this.resizeEdit(
                    clientX ?? this.edit.user,
                    this.mainElement.clientWidth,
                    user != null,
                    force
                );
                await this.nextTick();
                /** Not editing, hide the edit view and wait for the DOM to update */
                this.setGrid({ editWidth: 0 })
            }

            await this.nextTick();

            if (this.sidebar.width == 0) {
                this.sidebar.width = this.sidebar.user;
            }

            /** Update the sidebar */
            this.resizeSidebar(
                clientX ?? this.sidebar.user,
                this.mainElement.clientWidth,
                user != null,
                force
            );
        }
    }

    /**
     * Updates whether the user is resizing the sidebar or edit container
     * @param kind Sidebar or Edit
     * @param value Whether the user is resizing
     */
    setResizing(kind: "sidebar" | "edit", value: boolean) {
        document.body.style.cursor = value ? 'col-resize' : '';
        this[kind].resizing = value;
    }

    open(what: "main" | "edit") {
        let handle: number;
        if (what == "main") {
            /** If the main view is already open */
            if (this.mainElement.clientWidth > this.main.size.min) return;
            handle = this.app.padding + this.sidebar.width + this.app.handle_size + this.main.size.min;
        } else {
            /** If the edit view is already open */
            if (this.edit.width > this.edit.size.min) return;
            handle = this.app.width - this.edit.tiny.max - this.app.padding;
        }

        this.setResizing('edit', true);
        this.render(handle, true);
        this.setResizing('edit', false);
    }

    /**
     * Updates the main view and the data-main-class attribute
     * @param main The width of the main
     */
    private resizeMain(main: number, force: boolean) {
        const tiny   = main <= this.main.tiny.max;
        const normal = main >= this.main.normal.min && main <= this.main.normal.max;
        const large  = main > this.main.normal.max;
        // console.log(`tiny: ${tiny}, main: ${main}`)

        /** If the main view is already the correct size */
        if ((tiny && this.main.state != 'tiny') ||
            (normal && this.main.state != 'normal') ||
            (large && this.main.state != 'large') ||
            force) {

            this.main.state = tiny ? 'tiny' : normal ? 'normal' : 'large';

            /** Query all elements that have a data-main-class attribute */
            this.mainQueryList = document.querySelectorAll("[data-main-class]")

            /** Update all CSS classes */
            for (const element of this.mainQueryList) {
                // Get the classes
                const classes = element.getAttribute("data-main-class")?.split(" ") ?? [];
                /** Remove all attribute classes */
                this.clearClasses(element, classes, ['tiny', 'normal', 'large'])

                switch (true) {
                    case tiny:   this.addClasses(element, classes, 'tiny'); break;
                    case normal: this.addClasses(element, classes, 'normal'); break;
                    case large:  this.addClasses(element, classes, 'large'); break;
                }
            }
        }
    }

    /**
     * Updates the sidebar view and the data-sidebar-class attribute
     * @param handle The position of the handle
     * @param main The width of the main
     * @param user Whether the user is resizing the sidebar
     * @param force Whether to force the resize, even if the user is not resizing
     */
    private resizeSidebar(handle: number, main: number, user: boolean, force: boolean) {
        if (!this.sidebar.resizing && !force) return;

        /** Amount of space the sidebar has to grow (or shrink) */
        const grow_space = main - this.main.size.min;
        /** The size we would like the sidebar to be */
        const max_size = this.sidebar.width + grow_space;
        /** Whether or not the sidebar should be tiny:
         * If the handle is between the sidebar.tiny.min and sidebar.tiny.max,
         * or if the max_size is less than the sidebar.normal.min
         */
        const tiny = (this.sidebar.tiny.min <= handle && handle <= this.sidebar.tiny.max) ||
                      max_size <= this.sidebar.normal.min;

        /** If the tiny sidebar would not result in the main view being large again, dont be tiny */
        if (!user &&
            max_size <= this.sidebar.normal.min &&
            (main + (this.sidebar.width - this.sidebar.size.min) <= this.main.size.min))
            return

        // console.log(`resizeSidebar, handle: ${handle}, main: ${main}, user: ${user}, force: ${force}, tiny: ${tiny}, size: ${size}, this.sidebar.width: ${this.sidebar.width}, grow_space: ${grow_space}`)
        if (tiny) {
            this.setGrid({ sidebarWidth: this.sidebar.size.min })
        } else {
            this.setGrid({ sidebarWidth: Math.min(handle - 1.25*16, max_size, this.sidebar.size.max) })
        }

        /** Only save if the user make changes */
        if (user) this.sidebar.user = handle;

        /** If the sidebar is not the correct size */
        if ((tiny && this.sidebar.state != 'tiny') ||
            (!tiny && this.sidebar.state != 'normal') ||
            force) {
            // Save the current state
            this.sidebar.state = tiny ? 'tiny' : 'normal';

            /** Query all elements that have a data-sidebar-class attribute */
            this.sidebarQueryList = document.querySelectorAll("[data-sidebar-class]")

            /** Update all CSS classes */
            for (const element of this.sidebarQueryList) {
                // Get the classes
                const classes = element.getAttribute("data-sidebar-class")?.split(" ") ?? [];
                /** Remove all attribute classes */
                this.clearClasses(element, classes, ['tiny', 'normal'])
                this.addClasses(element, classes, tiny ? 'tiny' : 'normal')
            }
        }

        if (this.playlistEditing)
            this.resizeEdit(handle, main, user, false, true)
    }

    /**
     * Updates the edit view and the data-edit-class attribute
     * @param handle The position of the handle
     * @param main The width of the main
     * @param user Whether the user is resizing the edit view
     * @param force Whether to force the resize, even if the user is not resizing
     * @param recursed Whether this function has been called recursively. Used when trying to minimize the sidebar
     */
    private async resizeEdit(handle: number, main: number, user: boolean, force = false, recursed = false) {
        if (!this.edit.resizing && !force) return false;

        /** Utmost right in the app view */
        const handleMax = this.appElement.clientWidth - this.app.padding;
        /** Location of the handle seen from the right side of the main view / window - padding */
        let handleOffsetRight = handleMax - handle + this.app.handle_size;
        /** Location of the handle seen from the left side of the main view */
        let handleOffsetLeft = handle - this.sidebar.width - 1.25*16 - this.app.handle_size

        /** Get the available space between the minimum info view and edit view size */
        let freeSpace = main - this.main.size.min - this.edit.tiny.max + this.edit.width;

        /** The user has never opened the edit view yet */
        if (this.edit.user == 0) {
            /** If there is some space, set the separator at 66% for the info view and 33% for the edit view */
            handleOffsetLeft = this.main.size.min + freeSpace * 0.66;
            handleOffsetRight = this.edit.tiny.max + freeSpace * 0.33;

            /** Save the new position */
            handle = handleMax - handleOffsetRight + this.app.handle_size;

            // console.log(`freeSpace: ${freeSpace}, handleMax: ${handleMax}, handleOffsetLeft: ${handleOffsetLeft}, handleOffsetRight: ${handleOffsetRight}, handle: ${handle}`)
        }

        /** If there is not enough space left for the info view,
         *  AND not mobile
         */
        let full   = handleOffsetLeft < this.main.size.min && this.appElement.clientWidth > this.app.mobile && this.playlistEditing;
        /** If enough space for the info view and not crossing the minimum size for the edit window,
         *  OR mobile
         */
        let normal = (this.main.size.min <= handleOffsetLeft && handleOffsetRight >= this.edit.tiny.max) ||
                        this.appElement.clientWidth <= this.app.mobile;
        /** If the window should be clipped tiny  */
        let tiny  = handleOffsetRight < this.edit.tiny.max && !recursed;


        // console.log(`editResize, editWidth: ${this.edit.width}, userWidth: ${this.edit.user}, main: ${main}, handle: ${handle}, sidebar: ${this.sidebar.width}, handleOffsetLeft: ${handleOffsetLeft}, handleOffsetRight: ${handleOffsetRight}, full: ${full}, large: ${large}, normal: ${normal}, tiny: ${tiny}`)

        /** Prefer both views to be normal */
        if (normal)     this.setGrid({ editWidth: handleOffsetRight })
        else if (full)  this.setGrid({ editWidth: handleMax - this.edit.size.min - this.sidebar.width - this.app.padding })
        else if (tiny) this.setGrid({ editWidth: this.edit.size.min })

        let large  = this.edit.width >= this.edit.large.min;
            normal = this.edit.width >= this.edit.normal.min;
        let small  = this.edit.width >= this.edit.tiny.max && this.edit.width < this.edit.normal.min;

        /** Only save if the user make changes */
        if (user) this.edit.user = handle;


        /** Query all elements that have a data-edit-class attribute */
        this.editQueryList = document.querySelectorAll("[data-edit-class]")

        if ((tiny && this.edit.state != 'tiny') ||
            (small && this.edit.state != 'small') ||
            (normal && this.edit.state != 'normal') ||
            (large && this.edit.state != 'large') ||
            (full && this.edit.state != 'full') ||
            force) {
            // Save the current state
            this.edit.state = tiny ? 'tiny' : full ? 'full' : large ? 'large' : normal ? 'normal' : 'small';

            for (const element of this.editQueryList) {
                // Get the classes
                const classes = element.getAttribute("data-edit-class")?.split(" ") ?? [];

                /** Remove all attribute classes */
                this.clearClasses(element, classes, ['tiny', 'small', 'normal', 'large', 'full'])
                /** Try to set the 'tiny' or 'full class'. If this does not do anything, we apply the
                 * 'small', 'normal' or 'large' class none the less.
                 */
                if ((tiny && this.addClasses(element, classes, 'tiny')) ||
                    (full && this.addClasses(element, classes, 'full'))) {
                    continue;
                }

                switch (true) {
                    case large:  this.addClasses(element, classes, 'large'); break;
                    case normal: this.addClasses(element, classes, 'normal'); break;
                    default:     this.addClasses(element, classes, 'small'); break;
                }
            }
        }

        /** If we both need to be tiny and full, we do not have enough space for both items.
         * Try to minimize the sidebar. If there is not enough space for the main view to grow even after the sidebar
         * would have shrunk, the sidebar itself will not minimize. This will cause an inifinte loop, hence we check
         * for recursion */
        if (tiny && full && !recursed) {
            await this.nextTick();
            this.resizeSidebar(handle, this.mainElement.clientWidth, false, true);
            await this.nextTick();
            this.resizeEdit(handle, this.mainElement.clientWidth, false, true, true);
        }
    }

    async setMobile() {
        this.setGrid({ sidebarWidth: 0, editWidth: -1 })
        await this.nextTick();
        this.resizeMain(this.mainElement.clientWidth, true);

        this.sidebarQueryList = document.querySelectorAll("[data-sidebar-class]")
        /** Update all CSS classes */
        for (const element of this.sidebarQueryList) {
            // Get the classes
            const classes = element.getAttribute("data-sidebar-class")?.split(" ") ?? [];
            /** Remove all attribute classes */
            this.clearClasses(element, classes, ['tiny', 'normal'])
            this.addClasses(element, classes, 'normal')
        }

        /** Query all elements that have a data-edit-class attribute */
        this.editQueryList = document.querySelectorAll("[data-edit-class]")

        let large  = this.mainElement.clientWidth >= this.edit.large.min;
        let normal = this.mainElement.clientWidth >= this.edit.normal.min;
        let small  = this.mainElement.clientWidth >= this.edit.tiny.max;

        for (const element of this.editQueryList) {
            // Get the classes
            const classes = element.getAttribute("data-edit-class")?.split(" ") ?? [];

            /** Remove all attribute classes */
            this.clearClasses(element, classes, ['tiny', 'small', 'normal', 'large', 'full'])

            switch (true) {
                case large:  this.addClasses(element, classes, 'large'); break;
                case normal: this.addClasses(element, classes, 'normal'); break;
                default:  this.addClasses(element, classes, 'small'); break;
            }
        }
    }

    /**
     *
     * @param sidebarWidth Width of the newly set sidebar
     * @param editWidth
     */
    private setGrid({sidebarWidth, editWidth}: {sidebarWidth?: number, editWidth?: number}) {
        const ssave = sidebarWidth != undefined, esave = editWidth != undefined;

        // Update the sidebar width. If undefined, use the current width
        sidebarWidth = sidebarWidth ?? this.sidebar.width;
        let sidebar  = sidebarWidth > 0 ? `${sidebarWidth/16}rem ${this.app.handle_size}px` : '';

        // Update the edit width. If undefined, use the current width
        editWidth = editWidth ?? (this.playlistEditing ? this.edit.width : 0);
        let edit  = editWidth > 0 ? `${this.app.handle_size}px ${editWidth/16}rem` : '0 0';
            edit  = editWidth == -1 ? '' : edit

        // Save the width if it wasn't undefined
        if (ssave) this.sidebar.width = sidebarWidth;
        if (esave) this.edit.width = editWidth;

        /** Set the grid */
        this.appElement.style.gridTemplateColumns = `${sidebar} 1fr ${edit}`;
    }

    /**
     * Removes all custom attribute css classes from a given element
     * @param element Element from which to remove
     * @param classes All custom classes present on this element
     * @param prefixes Prefixes which could be present on the element
     */
    private clearClasses(element: Element, classes: string[], prefixes: string[]) {
        classes.forEach(class_ => {
            prefixes.forEach(prefix => {
                element.classList.remove(class_.replace(`${prefix}-`, ''));
            })
        })
    }

    /**
     * Adds all custom attribute css classes to a given element with a given prefix
     * @param element Element to which to add
     * @param classes All custom classes present on this element
     * @param prefix The prefix indicating which classes should be added
     */
    private addClasses(element: Element, classes: string[], prefix: string) {
        let added = false;
        classes.forEach(class_ => {
            if (class_.includes(prefix)) {
                element.classList.add(class_.replace(`${prefix}-`, ''));
                added = true;
            }
        })

        return added;
    }
}