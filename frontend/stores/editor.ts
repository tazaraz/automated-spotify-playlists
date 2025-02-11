import { Store, Pinia } from "pinia-class-component";
import Playlists, { type LoadedPlaylist } from "./playlists";
import type { PlaylistCondition, PlaylistSource, PlaylistStatement } from "../../backend/src/shared/types/playlist";
import type { CPlaylist, CTrack } from "../../backend/src/shared/types/client";
import Fetch from "@/composables/fetch";
import Layout from "./layout";
import type { EditorCondition } from "~/components/UI/editor/condition.vue";
import type { EditorSource } from "~/components/UI/editor/source.vue";
import type { EditorStatement } from "~/components/UI/editor/statement.vue";

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

export enum EditorError {
    NONE        = 0b000,
    NO_SOURCES  = 0b001,
    SOURCE      = 0b010,
    FILTER      = 0b100,
}

@Store
export default class Editor extends Pinia {
    /** Playlists reference */
    playlists: Playlists = null as any;
    /** Layout reference */
    layout: Layout = null as any;

    /** The id of the currently editing playlist */
    id: string = null as any;
    /** The index of the currently editing playlist */
    index!: number;
    /** Name of the current playlist */
    name!: string;
    /** Description of the current playlist */
    description!: string;
    /** The logs of the playlist */
    logs!: LoadedPlaylist['logs'];
    /** The sources of the playlist */
    sources: PlaylistSource[] = [];
    /** The filters of the playlist */
    filters: PlaylistStatement = null as any;

    /** The playlist which is currently being edited */
    get playlist(): CPlaylist {
        if (this.playlists.storage)
            return this.playlists.storage[this.index];

        // If there are no playlists, return nothing. Usefull when not logged in
        return undefined as any;
    }

    configChanged: boolean = false;
    executing: boolean = false

    /** Errors */
    error: EditorError = EditorError.NONE;
    /** References to the Filter Editor */
    refs: {
        sources: (EditorSource)[],
        filters: (EditorCondition | EditorStatement)[],
    } = { sources: null as any, filters: null as any };

    /** Contains the playlist configuration on load if we'd want to restore it */
    oldPlaylist: CPlaylist = null as any;
    /** The playlist sources and filters, but flattened for the GUI to use */
    flattened: PlaylistFilterEntry[] = [];
    /** If the playlist is converted to an automated playlist, upon saving, we need to move the tracks in the playlist
     * to the manually included tracks */
    includedTracks: CTrack[] = [];

    /**
     * Loads the playlist configuration into the editor
     * @param playlist Playlist to be loaded
     * @returns Whether the playlist was loaded successfully
     */
    loadConfig(playlist: LoadedPlaylist) {
        if (!playlist.filters) return false;
        // Update the layout information
        this.layout.showEditor(true);
        // Update the references
        this.playlists.editor = this;

        // Store a copy for reverting purposes
        this.oldPlaylist = this.playlists.convertToCPlaylist(playlist);

        // Copy data
        this.id = playlist.id;
        this.name = playlist.name;
        this.description = playlist.description;
        this.index = playlist.index;
        this.logs = playlist.logs;

        // Copy the sources and filters
        this.sources = JSON.parse(JSON.stringify(playlist.sources));
        this.filters = JSON.parse(JSON.stringify(playlist.filters));
        this.flattened = this.flatten(this.filters)
        return true;
    }

    /** Clears the editor */
    close() {
        this.layout.showEditor(false);
        this.id = "";
        this.index = -1;
        this.name = "";
        this.description = "";
        this.logs = [];
        this.sources = [];
        this.filters = null as any;
        this.flattened = [];
    }

    resetConfig(kind: 'name' | 'description' | 'sources' | 'filters') {
        switch (kind) {
            case 'name':
            case 'description':
                this[kind] = this.oldPlaylist[kind];
                this.updateBasic(kind, this[kind]);
                return;
            case 'sources':
                this.sources = JSON.parse(JSON.stringify(this.oldPlaylist.sources));
                break;
            case 'filters':
                this.filters = JSON.parse(JSON.stringify(this.oldPlaylist.filters));
                this.flattened = this.flatten(this.filters)
                break;
        }
    }

    /** Interval after which basic info change (name & description) will be synced */
    basicUpdateTimeout: any = 0;
    /** Updates the basic info about the playlist
     * @param kind The kind of info to update
     * @param value The value of the event
     */
    updateBasic(kind: 'name' | 'description', value: string) {
        this[kind] = value;

        // After 1 second, update the playlist
        clearTimeout(this.basicUpdateTimeout);
        this.basicUpdateTimeout = setTimeout(async () => {
            if ((!this.playlists.unpublished || this.playlists.unpublished.id !== this.playlist.id)
                && this.name !== "") {
                Fetch.put(`server:/playlist/${this.playlist.id}/basic`, { data: {
                    name: this.name,
                    description: this.description || ""
                }})
                .then(() => {
                    this.playlist[kind] = value;
                    // If the currently loaded playlist is the one we updated, update it
                    if (this.playlists.loaded.id === this.playlist.id)
                        this.playlists.loaded[kind] = value;
                })
            }
        }, 1000);
    }

    /**
     * Updates a playlist server-side and executes the given filters
     * @param playlist Playlist to be updated server-side
     */
    async syncPlaylist(playlist: LoadedPlaylist | CPlaylist) {
        return Fetch.put("server:/playlist", {
            headers: { 'Content-Type': 'json' },
            data: {
                id: playlist.id,
                user_id: playlist.user_id,
                name: playlist.name,
                description: playlist.description ?? "",
                filters: playlist.filters,
                sources: playlist.sources,
            }
        })
    }

    /** Adds a new source */
    addSource() {
        this.sources.push({ origin: "Library" as any, value: '' })
        this.configIsValid();
    }

    /** Updates a source
     * @param index Index of the source which should be updated
     * @param entry New source entry
     */
    updateSource(index: number, entry: PlaylistSource) {
        // Sources update inplace as they are passed by reference to the components
        this.configIsValid();
    }


    /** Deletes a source
     * @param index Index of the source which should be deleted
     */
    deleteSource(index: number) {
        this.sources.splice(index, 1);
        this.configIsValid();
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
        location = location || this.filters.filters

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
            this.flattened = this.flatten(this.filters);
        }

        this.configIsValid();
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
        location = location || this.filters.filters

        // If the entry is nested somewhere
        if (index !== "" && indexes.length > 0) {
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

            this.flattened = this.flatten(this.filters);
            this.configIsValid();
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
            location = location ?? this.filters.filters

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

        this.flattened = this.flatten(this.filters);
        this.configIsValid();
    }

    /**
     * Saves the playlist to the server
     */
    async save() {
        /** First we check if the sources and filters are valid */
        if (!this.filters || !(await this.configIsValid()))
            return;

        // Update the playlist
        if (// If unpublished
            (this.playlists.unpublished?.id == this.id ||

            // If published, but the filters or track sources have changed
            (!this.playlists.unpublished && this.configChanged)
        )) {
            const packet_playlist = this.playlists.copy(this.playlist as CPlaylist)
            packet_playlist.name        = this.name
            packet_playlist.description = this.description
            packet_playlist.sources     = this.sources
            packet_playlist.filters     = this.filters

            // If the playlist has been converted to an automated playlist, move the old tracks to the included tracks
            if (this.includedTracks.length > 0) {
                this.playlist.included_tracks = this.includedTracks.map(track => track.id)
                // If the playlist is loaded, update the included tracks
                if (this.playlists.loaded.id == this.playlist.id)
                    this.playlists.loaded.included_tracks = this.includedTracks
            }

            // Sync with the server
            const old_id = this.id
            const result = await this.syncPlaylist(packet_playlist)

            if (result.status > 300) {
                FetchError.create({status: result.status, message: result.data.error, duration: 5000})
                return false;
            }

            // Updating succeeded, update the real playlist.
            this.id = this.playlist.id = result.data
            this.playlists.storage[this.index] = this.playlists.copy(packet_playlist)

            // Reload the playlist and update the old version
            await this.playlists.loadUserPlaylistByID(this.id);
            this.oldPlaylist = this.playlists.convertToCPlaylist(this.playlists.loaded);

            // Reset the unpublished automated playlist boolean
            if (old_id === 'unpublished') {
                this.playlists.unpublished = null;
                // Update the URL, but prevent a dom rerender
                history.pushState({}, '', '/playlist/' + this.id)
            }
        }

        return true;
    }

    /**
     * Executes the playlist
     */
    async execute() {
        this.executing = true;

        /** Start the execution of the playlist */
        const result = await Fetch.patch(`server:/playlist/${this.id}`)
        if (result.status != 201) {
            return this.executing = false;
        }

        // Wait for the execution to finish
        while (true) {
            /** Response is when running only the log, and when completed a playlist */
            const response = await Fetch.patch(`server:/playlist/${this.id}`, { retries: 0 });

            switch (response.status) {
                case 302:
                    this.logs = [response.data.log];
                    continue;
                case 200:
                    // Store the log
                    this.logs = response.data.logs;
                    response.data.owner = this.playlist.owner

                    // Save the url of the old playlist image
                    const old_image = this.playlist.image

                    // Update the all_tracks
                    let all_tracks = response.data.matched_tracks.concat(response.data.included_tracks)
                        all_tracks = all_tracks.filter((track: string) => !response.data.excluded_tracks.includes(track));

                    // Update the container
                    response.data.image = this.playlist.image;
                    response.data.all_tracks = all_tracks;
                    await this.playlists.save(response.data);


                    // If it is the loaded playlist, load the new tracks
                    if (this.playlist.id === this.playlists.loaded.id || this.playlists.loaded.id == 'unpublished') {
                        await this.playlists.loadUserPlaylistByID(this.playlist.id)

                        /** Load the first 50 tracks manually, as the Spotify API might not yet up to date */
                        const track_ids = this.playlists.loaded.all_tracks.slice(0, 50) as string[];
                        // Fetch the tracks and convert
                        const tracks = (await Fetch.get<any[]>('spotify:/tracks', { ids: track_ids })).data
                                       .map((track: any) => this.playlists.convertToCTrack(track))
                        // Replace the first 50 tracks
                        this.playlists.loaded.all_tracks.splice(0, 50, ...tracks)

                        /** Fetch new artwork */
                        new Promise(async (resolve) => {
                            let tries = 4;

                            while (tries--) {
                                const img_res = await Fetch.get(`spotify:/playlists/${this.playlist.id}`, {
                                    query: { fields: 'images' }
                                })

                                // If the request was successful, update the image
                                if (img_res.ok) {
                                    const new_image = Fetch.bestImage(img_res.data.images)

                                    // Check if the image has changed
                                    if (new_image != old_image) {
                                        this.playlists.storage[this.index].image = new_image;
                                        this.playlists.loaded.image = new_image;
                                        break;
                                    }
                                }

                                // Wait before trying again
                                await new Promise(resolve => setTimeout(resolve, 5000))
                            }

                            resolve(true);
                        })
                    }

                default:
                    // Stop the execution
                    this.executing = false;
                    return;
            }
        }
    }

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

    /**
     * Imports a playlist configuration
     * @param base64 The base64 encoded string of the playlist configuration
     * @param mode Whether to append the configuration to the current one or overwrite it.
     */
    importConfig(base64: string, mode: 'overwrite' | 'append') {
        const config = JSON.parse(atob(base64));
        switch (mode) {
            case 'overwrite':
                this.sources = config.sources;
                this.filters = config.filters;
                break;
            case 'append':
                this.sources = this.sources.concat(config.sources);
                this.filters.filters = this.filters.filters.concat(config.filters);
                break;
        }

        this.flattened = this.flatten(this.filters);
    }

    /**
     * Exports the playlist configuration
     */
    exportConfig() {
        return btoa(JSON.stringify({
            sources: this.sources,
            filters: this.filters
        }))
    }

    /**
     * Checks if the config has changed and whether it was valid or not
     * @returns Whether the config is valid
     */
    async configIsValid() {
        /** Check if the config has changed */
        this.configChanged = JSON.stringify(this.sources) != JSON.stringify(this.oldPlaylist.sources) ||
                             JSON.stringify(this.filters) != JSON.stringify(this.oldPlaylist.filters);

        // Wait for the DOM to update
        await this.layout.nextTick();

        /** Check for any errors in the config */
        let error = EditorError.NONE;

        // We require at least one source
        if (this.sources.length == 0)
            error |= EditorError.NO_SOURCES;

        // Sources
        for (const source of this.refs.sources || []) {
            if (!source.isValid()) {
                error |= EditorError.SOURCE;
                break;
            }
        }

        // Filters
        for (const filter of this.refs.filters || []) {
            if (!filter.isValid()) {
                error |= EditorError.FILTER;
                break;
            }
        }

        this.error = error;
        return error == EditorError.NONE;
    }
}