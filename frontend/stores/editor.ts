import { Store, Pinia } from "pinia-class-component";
import Playlists, { LoadedPlaylist } from "./playlists";
import { PlaylistCondition, PlaylistSource, PlaylistStatement } from "../../backend/src/shared/types/playlist";
import { CPlaylist, CTrack } from "../../backend/src/shared/types/client";
import { SourceDescription as Sources } from "../../backend/src/shared/types/descriptions";
import Fetch from "./fetch";
import FetchError from "./error";

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
export default class Editor extends Pinia {
    playlists!: Playlists;

    /** Whether the editor is shown */
    shown: boolean = false;

    /** The id of the currently editing playlist */
    id!: string;
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
    get playlist() { return this.playlists.storage[this.index]; }

    refs: any = null;

    saving: boolean = false
    executing: boolean = false

    /** 0: no error, 1: Source error, 2: Filter error, 3: Source + Filter error */
    error: number = 0
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
        this.shown = true;
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
        this.shown = false;
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
        this.sources.push({ origin: "library" as any, value: '' })
    }

    /** Deletes a source
     * @param index Index of the source which should be deleted
     */
    deleteSource(index: number) {
        this.sources.splice(index, 1)
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

            this.flattened = this.flatten(this.filters);
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
    }

    /**
     * Saves the playlist to the server
     */
    async save() {
        if (this.error > 0) return;
        this.saving = true;

        // First we check if, if it is an automated playlist, the sources and filters are valid
        if (this.filters) {
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
        if (this.filters &&
                // If unpublished
                (this.playlists.unpublished?.id == this.id ||

                // If published, but the filters or track sources have changed
                (!this.playlists.unpublished &&
                    (JSON.stringify(this.filters) != JSON.stringify(this.playlist.filters) ||
                     JSON.stringify(this.sources) != JSON.stringify(this.playlist.sources)
        )))) {
            const packet_playlist = this.playlists.copy(this.playlist as CPlaylist)
            packet_playlist.sources = this.sources
            packet_playlist.filters = this.filters

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
            this.playlists.storage[this.index] = packet_playlist
            this.id = this.playlist.id = result.data

            // Reset the unpublished automated playlist boolean
            if (old_id === 'unpublished') {
                this.playlists.unpublished = null;
                // Update the URL, but prevent a dom rerender
                history.pushState({}, '', '/playlist/' + this.id)
            }
        }

        // Sync with the server
        this.saving = false;
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

            if (response.status === 302) {
                this.logs = [response.data.log];
                continue;
            } else if (response.status === 200) {
                // Store the log
                this.logs = response.data.logs;
                response.data.owner = this.playlist.owner

                let all_tracks = response.data.matched_tracks.concat(response.data.included_tracks)
                    all_tracks = all_tracks.filter((track: string) => !response.data.excluded_tracks.includes(track));

                response.data.all_tracks = all_tracks;
                this.playlists.save(response.data);

                // If it is the loaded playlist, load the new tracks
                if (this.playlist.id === this.playlists.loaded.id)
                    await this.playlists.loadUserPlaylistByID(this.playlists.loaded.id)
            } else {
                break;
            }
        }

        this.executing = false;
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
}