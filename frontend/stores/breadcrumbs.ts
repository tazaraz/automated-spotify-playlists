import { Store, Pinia } from "pinia-class-component";
import Layout from "./layout";

interface BreadCrumbItem {
    to: string;
    // Name of the page viewed
    name: string;
    // The scroll position of the previous page. Will be set automatically.
    scroll: number;
}

@Store
/**
 * Maintains a history of the pages the user has visited
 */
export default class BreadCrumbs extends Pinia {
    history: BreadCrumbItem[] = [];
    layout!: Layout;

    constructor() {
        super();
        if (!process.client) return;
        this.history = JSON.parse((localStorage.getItem("b") || "[]"));
    }

    async add(to: string | undefined, name: string | undefined) {
        // If the target url is somewhere else than a possible info page, empty the history
        if (to == "/" || to == "/info" || to == "/profile") {
            return this.clear()
        }

        // If the item is the last item in the array (the current page)
        if (this.history.length > 0 && this.history[this.history.length - 1]?.to === to)
            return

        // Make sure we know the name of the location
        if (!to || !name) return

        // Index of the item in the history
        const index = this.history.findIndex(h => h.to === to)

        // If the item is already in the history
        if (index >= 0) {
            // Remove all items after the item
            this.history = this.history.slice(0, index + 1)
            // Save the history
            localStorage.setItem("b", JSON.stringify(this.history))
            // Go to the item
            await navigateTo(to);
            // Wait for the page layout to rerender
            await this.layout.rerender();
            // Get the main element scroll item and restore the scroll position. Wait for the page to load
            document.getElementsByTagName('main')[0]?.children[0]?.children[1]?.scrollTo(0, this.history[index].scroll)
            return;
        }

        // Store the item
        this.history.push({ to, name, scroll: 0 })
        // Save the history
        localStorage.setItem("b", JSON.stringify(this.history))
    }

    clear() {
        this.history = []
        localStorage.setItem("b", JSON.stringify(this.history))
    }
}