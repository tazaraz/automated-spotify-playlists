import { Store, Pinia } from "pinia-class-component";
import Playlists from "./playlists";
import { PlaylistCondition, PlaylistSource, PlaylistStatement } from "../../backend/src/shared/types/playlist";
import { CTrack } from "../../backend/src/shared/types/client";
import { SourceDescription as Sources } from "../../backend/src/shared/types/descriptions";
import Fetch from "./fetch";

/**
 * README
 * This store contains the state of the playlist editor. Every change, every edit or filter addition in the editor is
 * stored here. This store is also responsible for saving the playlist to the server.
 */

interface PlaylistFilterEntry {
    indent: number;
    index: string;
    content: PlaylistStatement | PlaylistCondition;
}

@Store
export default class EditState extends Pinia {
    playlists!: Playlists;
    refs: any = null;

    saving: boolean = false
    /** 0: no error, 1: Source error, 2: Filter error, 3: Source + Filter error */
    error: number = 0

    name: string = "";
    description: string = "";

    globalFilter: PlaylistStatement["mode"] = null as any;
    computedSources: PlaylistSource[] = [];
    computedFilters: PlaylistStatement = null as any;
    flattenedFilters: PlaylistFilterEntry[] = [];

    /**If the playlist is converted to a smart playlist, upon saving, we need to move the tracks in the playlist
     * to the manually included tracks */
    includedTracks: CTrack[] = [];

    /**
     * Flattens the SelectedPlaylist filters object to a flat 1D array
     * @param filter Filters of the SelectedPlaylist
     * @param index For recursion, don't use. Indicates the flattened index
     * @param indent For recursion, don't use. Indicated the indent of an entry
     */
    flatten(filter: PlaylistStatement, index="", indent=0): PlaylistFilterEntry[] {
        let flattened = [];
        /**Add filters. We don't care about the content, as we update the selectedPlaylist directly every time a
        * component updates. After this we reconstruct the list by calling this function again. */

        // The first PlaylistStatement is always present, and we render this one somewhere else.
        if (index != "") {
            flattened.push({
                indent,
                index,
                content: filter
            })
        }

        for (let i = 0; i < filter.filters.length; i++) {
            // Get the entry and the correct index
            const entry = filter.filters[i]
            let flatindex = index == "" ? `${i}` : `${index}-${i}`

            // If it is a statement, recurse
            if (entry.mode) {
                flattened.push(...this.flatten(entry as PlaylistStatement, flatindex, indent + 1))
            } else {
                // Add the condition to the flattened store
                flattened.push({
                    indent: indent + 1,
                    index: flatindex,
                    content: entry
                })
            }
        }

        return flattened
    }

    /** Updates the basic info about the playlist
     * @param kind The kind of info to update
     * @param target The target of the event
     */
    updateBasic(kind: 'name' | 'description', target: any) {
        this[kind] = target.value
    }

    /** Adds a new source */
    addSource() {
        this.computedSources.push({ origin: Object.values(Sources)[0].description as any, value: '' })
    }

    /** Deletes a source
     * @param index Index of the source which should be deleted
     */
    deleteSource(index: number) {
        this.computedSources.splice(index, 1)
    }

    /**
     * Updates a filter in the SelectedPlaylist filters
     * @param entry The new state of the entry
     * @param index Index of the entry which has been updated
     */
    updateFilter(entry: PlaylistStatement | PlaylistCondition,
                 index: string,
                 location: (PlaylistStatement | PlaylistCondition)[] | null = null) {
        const indexes = index.split("-")

        // Initialize the location variable only once
        location = location || this.computedFilters.filters

        // If the entry is nested somewhere
        if (indexes.length > 1) {
            // Remove the first entry from the indexes and recurse
            this.updateFilter(entry, indexes.slice(1).join("-"), location[indexes[0]].filters)
        } else {
            // Update the entry, making sure to copy the contents if it is a statement
            if ((entry as PlaylistStatement).mode) {
                (entry as PlaylistStatement).filters = location[indexes[0]].filters
            }

            location[indexes[0]] = entry
            this.flattenedFilters = this.flatten(this.computedFilters);
        }
    }

    /**
     * Adds a filter
     * @param kind Kind of filter to add
     * @param index Index where to add the filter
     * @param location For recursion, don't use. Indicates the location in the computedFilters
     */
    addFilter(kind: "statement" | "condition",
              index: string = "",
              location: (PlaylistStatement | PlaylistCondition)[] | null = null) {
        const indexes = index.split("-")

        // Initialize the location variable only once
        location = location || this.computedFilters.filters

        // If the entry is nested somewhere
        if (index != "" && indexes.length > 0) {
            // Remove the first entry from the indexes and recurse
            this.addFilter(kind, indexes.slice(1).join("-"), location[indexes[0]].filters)
        } else {
            // Add the entry
            if (kind == "statement") {
                location.push({
                    mode: 'all',
                    filters: []
                })
            } else {
                location.push({
                    category: 'Track',
                    filter: 'Name',
                    operation: 'contains',
                    value: ''
                })
            }

            this.flattenedFilters = this.flatten(this.computedFilters);
        }
    }

    /**
     * Alters a filter based on the event
     * @param event Kind of action to perform
     * @param index Index of the entry on which the action should be performed
     * @param location For recursion, don't use. Indicates the location in the computedFilters
     */
    eventFilter(event: string, index: string, location: (PlaylistStatement | PlaylistCondition)[] | null = null) {
        if (event == "delete") {
            // Initialize the location variable only once
            location = location ?? this.computedFilters.filters

            const indexes = index.split("-")
            // If the entry is nested somewhere
            if (indexes.length > 1) {
                // Remove the first entry from the indexes and recurse
                this.eventFilter(event, indexes.slice(1).join("-"), location[indexes[0]].filters)
            } else {
                location.splice(parseInt(indexes[0]), 1)
            }
        } else if (event == "add") {
            this.addFilter("condition", index)
        } else if (event == "branch") {
            this.addFilter("statement", index)
        }

        this.flattenedFilters = this.flatten(this.computedFilters);
    }

    async save() {
        if (this.error > 0) return;
        this.saving = true;

        // First we check if, if it is a smart playlist, the sources and filters are valid
        if (this.computedFilters) {
            // We require at least one source
            if (this.refs.sources == undefined) this.error += 1;
            for (const source of this.refs.sources || []) {
                if (!source.isValid()) {
                    this.error += 1;
                    break;
                }
            }

            // Filters are optional
            if (this.refs.filters == undefined) this.error += 0;
            for (const filter of this.refs.filters || []) {
                if (!filter.isValid()) {
                    this.error += 2;
                    break;
                }
            }

            // Remove the error after 3 seconds
            if (this.error > 0) {
                setTimeout(() => {
                    this.saving = false;
                    this.error = 0;
                }, 5000);
                return;
            }
        }

        // Update the playlist
        if (this.computedFilters &&
                // If unpublished
                (this.playlists.unpublished?.id == this.playlists.editing.id ||

                // If published, but the filters or track sources have changed
                (!this.playlists.unpublished &&
                    (JSON.stringify(this.computedFilters) != JSON.stringify(this.playlists.editing.filters) ||
                     JSON.stringify(this.computedSources) != JSON.stringify(this.playlists.editing.sources)
        )))) {
            this.playlists.editing.sources = this.computedSources
            this.playlists.editing.filters = this.computedFilters

            // If the playlist has been converted to a smart playlist, move the old tracks to the included tracks
            if (this.includedTracks.length > 0)
                this.playlists.editing.included_tracks = this.includedTracks

            // Sync with the server
            const old_id = this.playlists.editing.id
            this.playlists.editing.id = await this.playlists.syncPlaylist(this.playlists.convertToCPlaylist(this.playlists.editing))

            // Reset the unpublished smart playlist boolean
            if (old_id === 'unpublished') {
                this.playlists.unpublished = null;
                // Update the URL, but prevent a dom rerender
                history.pushState({}, '', '/playlist/' + this.playlists.editing.id)
                await this.execute();
            }
        }

        if (this.playlists.unpublished && this.playlists.editing.id == 'unpublished')
            this.playlists.unpublished = null;

        // Update the playlist basic info
        this.playlists.editing.name = this.name
        this.playlists.editing.description = this.description

        // Sync with the server
        await this.playlists.updateBasic(this.playlists.editing)

        this.saving = false;
        this.reset();
    }

    async execute() {
        /** Start the execution of the playlist */
        const result = await Fetch.patch(`server:/playlist/${this.playlists.editing.id}`)
        if (result.status != 201) {
            return;
        }

        // Wait for the execution to finish
        while (await this.playlists.execute(this.playlists.editing)) continue;
    }

    reset() {
        this.name = this.playlists.editing.name;
        this.description = this.playlists.editing.description;
        this.includedTracks = [];

        if (this.playlists.editing.filters) {
            this.globalFilter    = this.playlists.editing.filters.mode;
            this.computedSources = JSON.parse(JSON.stringify(this.playlists.editing.sources));
            this.computedFilters = JSON.parse(JSON.stringify(this.playlists.editing.filters));
            this.flattenedFilters = this.flatten(this.computedFilters)
        } else {
            this.computedSources = null;
            this.computedFilters = null;
            this.flattenedFilters = null
        }
    }

    delete(){
        this.playlists.delete(this.playlists.editing)
    }
}