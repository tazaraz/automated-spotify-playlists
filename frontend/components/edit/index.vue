<template>
    <article class="rounded-2 p-2 bg-dark-subtle overflow-hidden">
        <template v-if="playlists && playlists.editing">
            <div class="d-none h-100 p-3 overflow-hidden flex-column align-items-center" data-edit-class="tiny-d-flex small-d-none normal-d-none large-d-none full-d-none">
                <h4 class="d-flex mb-4" style="width: 3rem"><fa-icon class="m-auto" :icon="['fas', 'wand-magic']" style="width: 2rem"></fa-icon></h4>
                <url class="d-flex mb-2 fs-4" style="width: 3rem; cursor: pointer;" @click="layout.open('edit')">
                    <fa-icon class="m-auto" :icon="['fas', 'angles-left']" style="width: 2rem"></fa-icon>
                </url>
                <hr class="w-100">
                <Image :src="playlists.editing" class="image mt-2 mb-4 w-100"></Image>
                <h4 class="text-nowrap" style="writing-mode:vertical-rl;">{{ playlists.editing.name }}</h4>
            </div>
            <div class="h-100 p-1 overflow-y-auto m-auto" data-edit-class="tiny-d-none" style="max-width: 50rem;">
                <div class="d-flex align-items-center mb-3 mt-2 text-white text-decoration-none">
                    <h4 class="ms-3 mb-0" style="width: 3rem"><fa-icon :icon="['fas', 'wand-magic']" style="width: 2rem"></fa-icon></h4>
                    <h4 class="m-0">
                        {{ playlists.editing.name }} Config
                    </h4>
                    <button type="button" id="editClose" class="d-block d-sm-none ms-auto me-3 btn-close" data-bs-dismiss="offcanvas"></button>
                </div>
                <hr>
                <div id="basic" class="d-grid mb-3 p-2 ps-4 pe-4" data-edit-class="small-stacked normal-wide large-wide">
                    <Image :src="playlists.editing" class="h-100 m-auto"></Image>
                    <div class="form-floating">
                        <input type="text" class="form-control" :value="playlists.editing.name">
                        <label>Playlist name</label>
                    </div>
                    <div class="form-floating">
                        <textarea class="form-control h-100 rounded-2" :value="playlists.editing.description"></textarea>
                        <label>Description</label>
                    </div>
                </div>
                <div class="d-flex">
                    <h5 class="flex-grow-1">Sources</h5>
                    <button class="btn action" @click="addSource"><fa-icon class="text-primary"
                    :icon="['fas', 'plus']"></fa-icon></button>
                </div>
                <section v-if="computedSources.length > 0" id="sources" class="flex-center align-items-center column-gap-3 mb-3">
                    <EditSource
                        v-for="source, index in computedSources"
                        ref="sources"
                        :source="source"
                        @delete="deleteSource(index)"></EditSource>
                </section>
                <div class="mt-4 d-flex">
                    <h5 class="flex-grow-1">Filters</h5>
                    <button class="btn action" @click="addFilter('condition')"><fa-icon class="text-primary" :icon="['fas', 'plus']"></fa-icon></button>
                    <button class="btn action" @click="addFilter('statement')"><fa-icon class="text-primary" :icon="['fas', 'code-branch']"></fa-icon></button>
                </div>
                <section v-if="computedFilters" id="filters" class="overflow-x-auto mb-5" data-edit-class="small-small normal-normal large-large">
                    <template v-for="entry in flattenedFilters">
                        <EditStatement
                            v-if="entry.content.mode"
                            ref="filters"
                            :indent="entry.indent"
                            :statement="entry.content"
                            @change="updateFilter($event, entry.index)"
                            @event="eventFilter($event, entry.index)"></EditStatement>
                        <EditCondition
                            v-else
                            ref="filters"
                            :indent="entry.indent"
                            :condition="entry.content"
                            @change="updateFilter($event, entry.index)"
                            @event="eventFilter($event, entry.index)"></EditCondition>
                    </template>
                </section>
                <br>
                <br>
                <br>
                <br>
                <section class="d-flex">
                    <button type="button" id="editSave" class="btn btn-primary me-3" data-bs-dismiss="offcanvas" @click="save">{{ saving ? "Running..." : "Save & run" }}</button>
                    <Image v-if="saving" src=""></Image>
                    <button type="button" id="editReset" class="btn btn-danger ms-auto" data-bs-dismiss="offcanvas" @click="reset">Reset</button>
                    <button type="button" id="editDiscard" class="btn btn-danger ms-3" data-bs-dismiss="offcanvas" @click="(playlists.editing = undefined as any)">Discard changes</button>
                </section>
            </div>
        </template>
    </article>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import Playlists from '~/stores/playlists';
import User from '~/stores/user';
import { Playlist, PlaylistCondition, PlaylistSource, PlaylistStatement } from '../../../backend/src/types/playlist';
import { CTrack } from '../../../backend/src/types/client';
import { Sources } from '../../../backend/src/types/filters';
import Layout from '~/stores/layout';

interface PlaylistFilterEntry {
    indent: number;
    index: string;
    content: PlaylistStatement | PlaylistCondition;
}

export default class Edit extends Vue {
    playlists!: Playlists;
    layout!: Layout;

    saving: boolean = false
    /** 0: no error, 1: Source error, 2: Filter error, 3: Source + Filter error */
    error: number = 0
    executingLog: Playlist['log'] = null as any;

    name: string = "";
    description: string = "";

    globalFilter: PlaylistStatement["mode"] = null as any;
    computedSources: PlaylistSource[] = [];
    computedFilters: PlaylistStatement = null as any;
    flattenedFilters: PlaylistFilterEntry[] = [];

    /**If the playlist is converted to a smart playlist, upon saving, we need to move the tracks in the playlist
     * to the manually included tracks */
    includedTracks: CTrack[] = [];

    created() {
        if (!process.client) return;
        this.playlists = new Playlists();
        this.playlists.setUser(new User());
    }

    beforeMount() {
        if (!process.client) return;
        this.layout = new Layout();
        this.reset();
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
        this.saving = true;

        // First we check if, if it is a smart playlist, the sources and filters are valid
        if (this.computedFilters) {
            // We require at least one source
            if (this.$refs.sources == undefined) this.error += 1;
            for (const source of this.$refs.sources || []) {
                if (!source.isValid())
                this.error += 1;
                    break;
            }

            // Filters are optional
            if (this.$refs.filters == undefined) this.error += 0;
            for (const filters of this.$refs.filters || []) {
                if (!filters.isValid())
                    this.error += 2;
                    break;
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
                (this.playlists.unpublished ||

                // If published, but the filters or track sources have changed
                (!this.playlists.unpublished &&
                    (JSON.stringify(this.computedFilters) != JSON.stringify(this.playlists.editing.filters) ||
                     JSON.stringify(this.computedSources) != JSON.stringify(this.playlists.editing.track_sources)
        )))) {
            this.playlists.editing.track_sources = this.computedSources
            this.playlists.editing.filters = this.computedFilters

            // If the playlist has been converted to a smart playlist, move the old tracks to the included tracks
            if (this.includedTracks.length > 0)
                this.playlists.editing.included_tracks = this.includedTracks

            // Sync with the server
            const old_id = this.playlists.editing.id
            this.playlists.editing.id = await this.playlists.syncPlaylist(this.playlists.convertToCPlaylist(this.playlists.editing))

            /**Execute the playlist. While incomplete, this will yield a log */
            let status = await this.playlists.execute(this.playlists.editing)
            while (typeof status != 'boolean') {
                this.executingLog = status
                status = await this.playlists.execute(this.playlists.editing)
            }

            // Reset the unpublished smart playlist boolean
            if (status && old_id === 'unpublished') {
                this.playlists.unpublished = null;
                // Update the URL, but prevent a dom rerender
                history.pushState({}, '', '/dashboard/playlist/' + this.playlists.editing.id)
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

    reset() {
        this.name = this.playlists.editing.name;
        this.description = this.playlists.editing.description;
        this.includedTracks = [];

        if (this.playlists.editing.filters) {
            this.globalFilter    = this.playlists.editing.filters.mode;
            this.computedSources = JSON.parse(JSON.stringify(this.playlists.editing.track_sources));
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
</script>

<style lang="scss" scoped>
article{
    overflow: auto;

    button.action {
        width: 2rem;
        padding: 0.5rem;
    }
}
.image {
    box-shadow: 0 4px 60px rgba(0, 0, 0, .8);
}

#basic {
    &.wide {
        grid-template-rows: 60px calc(130px - 1rem);
        grid-template-columns: 190px 1fr;
        gap: 1rem 2rem;
        max-width: 40rem;
        margin: auto;

        :first-child {
            grid-row: span 2;
        }
    }
    &.stacked {
        grid-template-rows: 190px 60px calc(130px - 2rem);
        grid-template-columns: 100%;
        gap: 2rem;
        max-width: 25rem;
        margin: auto;
    }
}
#sources {
    display: grid;
    grid-template-columns: auto auto 5fr 2rem;
    gap: 0.5rem;
}

#filters {
    &.large .filter-item {
        grid-template-columns: repeat(4, 1rem) max-content 1.5rem max-content 1.5rem 1fr repeat(3, 2rem);
    }
    &.normal .filter-item {
        grid-template-columns: repeat(4, 1rem) max-content 1.5rem 1fr 0 0 repeat(3, 2rem);
    }
    &.small .filter-item {
        grid-template-columns: repeat(4, 1rem) max-content 0 1fr 0 0 repeat(3, 2rem);
    }
}
#filters .filter-item {
    display: grid;
    grid-auto-rows: 40px;

    :deep(.grip) {
        color: $gray-600;
        display: flex;
        width: 100%;
        height: 100%;

        > * {
            margin: auto 0;
            display: none;
        }
    }

    &:hover :deep(.grip) > * {
        cursor: pointer;
        display: block;
    }
}
</style>
