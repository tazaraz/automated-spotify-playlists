import { Store, Pinia } from "pinia-class-component";

interface BreadCrumbItem {
    to: string;
    name: string;
}

@Store
export default class BreadCrumbs extends Pinia {
    history: BreadCrumbItem[] = []

    constructor() {
        super();
        if (!process.client) return;
        this.history = JSON.parse((localStorage.getItem("b") || "[]"))
    }

    add(to: string | undefined, name: string | undefined) {
        // If the target url is somewhere else than a possible info page, empty the history
        if (to == "/" || to == "/info" || to == "/profile") {
            return this.clear()
        }

        // If the item is the last item in the array (the current page)
        if (this.history.length > 0 && this.history[this.history.length - 1]?.to === to)
            return

        // Make sure we know the name of the location
        if (!to || !name) return


        // If we are going from the info page to a playlist, empty the history
        if (this.history.length > 0 && !to.startsWith("/info")) {
            this.clear()
        }

        // If the item is already in the history
        else if (this.history.find(h => h.to === to)) {
            // Remove all items after the item
            this.history = this.history.slice(0, this.history.findIndex(h => h.to === to) + 1)
            // Save the history
            localStorage.setItem("b", JSON.stringify(this.history))
            // Go to the item
            return navigateTo(to)
        }

        // Store the item
        this.history.push({ to, name })
        // Save the history
        localStorage.setItem("b", JSON.stringify(this.history))
    }

    clear() {
        this.history = []
        localStorage.setItem("b", JSON.stringify(this.history))
    }

    back() {
        if (this.history.length > 1) {
            this.history.pop()
            localStorage.setItem("b", JSON.stringify(this.history))
            navigateTo(this.history[this.history.length - 1].to)
        } else {
            this.history = []
            localStorage.setItem("b", JSON.stringify(this.history))
            navigateTo("/")
        }
    }
}