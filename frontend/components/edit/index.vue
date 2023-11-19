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
                <div class="position-sticky bg-dark-subtle z-3" style="top: -0.25rem;">
                    <div class="d-flex align-items-center pt-2 pb-3 text-white text-decoration-none" >
                        <h4 class="ms-3 me-3 mb-0"><fa-icon :icon="['fas', 'wand-magic']" style="width: 2rem"></fa-icon></h4>
                        <h4 class="m-0">
                            {{ playlists.editing.name }} Config
                        </h4>
                        <button type="button" id="editClose" class="d-block d-sm-none ms-auto me-3 btn-close" data-bs-dismiss="offcanvas"></button>
                    </div>
                    <hr class="m-0">
                </div>
                <div id="basic" class="d-grid mb-3 p-2 ps-4 pe-4" data-edit-class="small-stacked normal-wide large-wide">
                    <Image :src="playlists.editing" class="h-100 m-auto"></Image>
                    <div class="form-floating">
                        <input type="text" class="form-control" :value="playlists.editing.name" @input="syncBasic('name', $event.target?.value)">
                        <label>Playlist name</label>
                    </div>
                    <div class="form-floating">
                        <textarea class="form-control h-100 rounded-2" :value="playlists.editing.description" @input="syncBasic('description', $event.target?.value)"></textarea>
                        <label>Description</label>
                    </div>
                </div>
                <ul class="nav nav-tabs mb-3">
                    <li class="nav-item">
                        <span role='button' @click="showLog = false" :class="`nav-link${showLog ? '' : ' active'}`">Configuration</span>
                    </li>
                    <li class="nav-item">
                        <span role='button' @click="showLog = true" :class="`d-flex nav-link${showLog ? ' active' : ''}`">
                            Filter log
                            <Image class="d-inline shadow-none ms-2" style="width: 1.5rem; height: 1.5rem" v-if="executeState == 1" src=""></Image>
                        </span>
                    </li>
                </ul>
                <div :hidden="showLog" class="overflow-x-auto">
                    <div class="d-flex">
                        <h5 class="flex-grow-1">Sources</h5>
                        <button class="btn action" @click="editstate.addSource"><fa-icon class="text-primary"
                        :icon="['fas', 'plus']"></fa-icon></button>
                    </div>
                    <section v-if="editstate.computedSources.length > 0" id="sources" class="flex-center align-items-center column-gap-3 mb-3">
                        <EditSource
                            v-for="source, index in editstate.computedSources"
                            ref="sources"
                            :source="source"
                            @delete="editstate.deleteSource(index)"></EditSource>
                    </section>
                    <div class="mt-4 d-flex">
                        <div class="flex-grow-1">
                            <h5 class="d-inline me-3">Filters</h5>
                            <div>
                                <small>(match <select id="source-select" class="d-inline-flex form-select form-select-sm w-auto" @change="globalStatementChange">
                                <option v-for="mode in Object.keys(FilterParserOptions)" :value="mode" :selected="editstate.computedFilters.mode == mode">{{ mode }}</option>
                                </select> 1<sup>st</sup> level filters)</small>
                            </div>
                        </div>
                        <button class="btn action" @click="editstate.addFilter('condition')">
                            <fa-icon class="text-primary" :icon="['fas', 'plus']"></fa-icon>
                        </button>
                        <button class="btn action" @click="editstate.addFilter('statement')">
                            <fa-icon class="text-primary" :icon="['fas', 'code-branch']"></fa-icon>
                        </button>
                    </div>
                    <section v-if="editstate.computedFilters" id="filters" class="mb-5" data-edit-class="small-small normal-normal large-large">
                        <template v-for="entry in editstate.flattenedFilters">
                            <EditStatement
                                v-if="entry.content.mode"
                                ref="filters"
                                :indent="entry.indent"
                                :statement="entry.content"
                                @change="editstate.updateFilter($event, entry.index)"
                                @event="editstate.eventFilter($event, entry.index)"></EditStatement>
                            <EditCondition
                                v-else
                                ref="filters"
                                :indent="entry.indent"
                                :condition="entry.content"
                                @change="editstate.updateFilter($event, entry.index)"
                                @event="editstate.eventFilter($event, entry.index)"></EditCondition>
                        </template>
                    </section>
                </div>
                <EditLog :hidden="!showLog" :log="playlists.editing.log"></EditLog>
                <div v-if="editstate.error > 0" class="alert alert-primary" role="alert">
                    Some {{ editstate.error == 1 ? 'sources' : editstate.error == 2 ? 'filters' : 'filters and sources'}} are not filled in correctly
                </div>
                <hr>
                <small v-if="playlists.editing.id == 'example'" class="text-body-secondary">
                    'Save and apply filters' is disabled for the example smart playlist configuration
                </small>

                <section class="d-flex flex-wrap">
                    <div class="d-flex align-items-end dropdown mt-3 me-3">
                        <button class="btn" type="button" data-bs-toggle="dropdown">
                            <h5 class="m-0"><fa-icon :icon="['fas', 'arrow-up-from-bracket']" /></h5>
                        </button>
                        <ul class="dropdown-menu">
                            <li>
                                <Modal button-text="Export" button-class="dropdown-item">
                                    <div class="modal-header">
                                        <h1 class="modal-title fs-5" id="exampleModalLabel">Export Playlist configuration</h1>
                                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div class="modal-body">
                                        Copy the following code beneath to export the configuration of this playlist:
                                        <div class="bg-white rounded-2 p-2 pe-1 mt-3">
                                            <div class="overflow-y-auto" style="max-height: 20rem;">
                                                <code class="text-black text-break">
                                                    {{ window.btoa(JSON.stringify({
                                                        sources: playlists.editing.sources,
                                                        filters: playlists.editing.filters,
                                                    })) }}
                                                </code>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="modal-footer">
                                        <button type="button" class="btn btn-secondary" @click="copyConfig()">
                                            {{ copied == 0 ? 'Copy' : 'Copied' }}
                                        </button>
                                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Close</button>
                                    </div>
                                </Modal>
                            </li>
                            <li>
                                <Modal button-text="Import" button-class="dropdown-item">
                                    <div class="modal-header">
                                        <h1 class="modal-title fs-5" id="exampleModalLabel">Import Playlist configuration</h1>
                                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                    </div>
                                    <div class="modal-body">
                                        Import the configuration of this playlist by pasting the exported code beneath:
                                        <div>
                                            <textarea id="importConfigTextarea"
                                                      class="w-100 border-0 bg-white text-black rounded-2 p-2 pe-1 mt-3"
                                                      style="height: 20rem;"
                                                      @focusout="checkImportConfig"
                                                      @keyup="checkImportConfig"
                                            ></textarea>
                                        </div>
                                    </div>
                                    <div class="modal-footer">
                                        <div class="me-auto">
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="importOptions" id="importOption1" checked>
                                                <label class="form-check-label" for="importOption1">
                                                    Append config to current
                                                </label>
                                            </div>
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="importOptions" id="importOption2">
                                                <label class="form-check-label" for="importOption2">
                                                    Overwrite current config
                                                </label>
                                            </div>
                                        </div>
                                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                        <button type="button" class="btn btn-primary" data-bs-dismiss="modal" @click="importConfig" :disabled="!validImportConfig">Import</button>
                                    </div>
                                </Modal>
                            </li>
                        </ul>
                    </div>

                    <button type="button" id="editSave" class="d-flex align-items-center btn btn-primary me-3 mt-3" @click="execute" :disabled="playlists.editing.id == 'example'">
                        <span v-if="saveState == 0 && executeState == 0">
                            Save and apply filters
                        </span>
                        <span v-if="saveState == 1">
                            Saving
                        </span>
                        <span v-if="executeState == 1">
                            Applying filters
                        </span>
                        <span v-if="executeState == 2">
                            Done
                        </span>
                        <Image class="d-inline shadow-none ms-2" style="width: 1.5rem; height: 1.5rem" v-if="saveState == 1 || executeState == 1" src=""></Image>
                    </button>

                    <button type="button" id="editReset" class="btn btn-danger ms-auto mt-3 me-3" @click="resetConfig">Reset</button>
                </section>
            </div>
        </template>
    </article>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import Playlists, { CPlaylist } from '~/stores/playlists';
import User from '~/stores/user';
import Layout from '~/stores/layout';
import EditCondition from './condition.vue';
import EditStatement from './statement.vue';
import EditState from '~/stores/editstate';
import { FilterParserOptions } from '../../../backend/src/shared/types/descriptions';

export default class Edit extends Vue {
    playlists: Playlists = null as any;
    layout: Layout = null as any;
    editstate: EditState = null as any;

    window = window
    FilterParserOptions = FilterParserOptions;

    /** Interval after which basic info change (name & description) will be synced */
    basicUpdateTimeout: any = 0;

    showLog = false;
    /** 0: default, 1: pending, 2: finished */
    saveState = 0;
    /** 0: default, 1: pending, 2: finished */
    executeState = 0;
    /** 0: uncopied, 1: copied */
    copied = 0;
    /** 0: invalid config, 1: valid config */
    validImportConfig = 0;

    created() {
        if (!process.client) return;
        this.playlists = new Playlists();
        this.playlists.setUser(new User());
        this.editstate = new EditState();
        this.editstate.playlists = this.playlists;
    }

    beforeMount() {
        if (!process.client) return;
        this.layout = new Layout();
        this.editstate.reset();
    }

    /** Updates the info of the playlist */
    async save() {
        if (this.executeState > 0) return;

        this.editstate.refs = this.$refs;
        this.saveState = 1;
        await this.editstate.save();
        this.saveState = 0;
    }

    /** Executes the filters of the playlists */
    async execute() {
        if (this.saveState > 0 || this.executeState > 0) return;
        this.playlists.editing.log = { sources: [], filters: [] };
        await this.save();

        this.executeState = 1;
        await this.editstate.execute();
        this.executeState = 2;

        this.$forceUpdate();
        setTimeout(() => this.executeState = 0, 1000);
    }

    async syncBasic(target: 'name' | 'description', value: string) {
        if (this.basicUpdateTimeout) clearTimeout(this.basicUpdateTimeout);
        this.editstate.updateBasic(target, value);
        this.playlists.editing[target] = value as CPlaylist['name' | 'description'];

        this.basicUpdateTimeout = setTimeout(async () => {
            await this.playlists.updateBasic(this.playlists.editing)
            this.basicUpdateTimeout = 0;
        }, 1000);
    }

    async resetConfig() {
        await this.playlists.loadEditingPlaylist(this.playlists.editing.id);
        this.editstate.reset();
    }

    globalStatementChange(event: Event) {
        this.editstate.computedFilters.mode = (event.target! as HTMLSelectElement).value as keyof typeof FilterParserOptions;
    }

    async copyConfig() {
        await navigator.clipboard.writeText(btoa(JSON.stringify({
            sources: this.playlists.editing.sources,
            filters: this.playlists.editing.filters,
        })));
        this.copied = 1;
        setTimeout(() => this.copied = 0, 1000);
    }

    checkImportConfig() {
        try {
            const textarea = document.getElementById('importConfigTextarea') as HTMLTextAreaElement;
            JSON.parse(atob(textarea.value));
            this.validImportConfig = 1;
        } catch (e) {
            this.validImportConfig = 0;
        }
    }

    async importConfig() {
        const textarea = document.getElementById('importConfigTextarea') as HTMLTextAreaElement;
        const config = JSON.parse(atob(textarea.value));
        if (document.getElementById('importOption1')?.checked) {
            this.playlists.editing.sources = this.playlists.editing.sources.concat(config.sources);
            this.playlists.editing.filters.filters = this.playlists.editing.filters.filters.concat(config.filters);
        } else {
            this.playlists.editing.sources = config.sources;
            this.playlists.editing.filters = config.filters;
        }
        textarea.value = "";
        this.validImportConfig = 0;
        this.$forceUpdate();
        this.editstate.reset();
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
        grid-template-columns: repeat(3, 1rem) max-content 1.5rem max-content 1.5rem 1fr repeat(3, 2rem);
    }
    &.normal .filter-item {
        grid-template-columns: repeat(3, 1rem) max-content 1.5rem 1fr 0 0 repeat(3, 2rem);
    }
    &.small .filter-item {
        grid-template-columns: repeat(3, 1rem) max-content 0 1fr 0 0 repeat(3, 2rem);
    }
}
#filters .filter-item {
    display: grid;
    grid-auto-rows: 40px;
}

:deep(#playlist-export) {
    margin: 0 !important;
}
</style>
