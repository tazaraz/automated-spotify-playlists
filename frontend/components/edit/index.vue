<template>
    <article class="rounded-2 p-2 bg-dark-subtle overflow-hidden">
        <template v-if="playlists && editor">
            <div class="d-none h-100 p-3 overflow-hidden flex-column align-items-center" data-edit-class="tiny-d-flex small-d-none normal-d-none large-d-none full-d-none">
                <h4 class="d-flex mb-4" style="width: 3rem"><fa-icon class="m-auto" :icon="['fas', 'wand-magic']" style="width: 2rem"></fa-icon></h4>
                <url class="d-flex mb-2 fs-4" style="width: 3rem; cursor: pointer;" @click="layout.open('edit')">
                    <fa-icon class="m-auto" :icon="['fas', 'angles-left']" style="width: 2rem"></fa-icon>
                </url>
                <hr class="w-100">
                <Image :src="editor.playlist" class="image mt-2 mb-4 w-100"></Image>
                <h4 class="text-nowrap" style="writing-mode:vertical-rl;">{{ editor.name }}</h4>
            </div>
            <div class="h-100 p-1 overflow-y-auto m-auto" data-edit-class="tiny-d-none" style="max-width: 50rem;">
                <div class="position-sticky bg-dark-subtle z-3" style="top: -0.25rem;">
                    <div class="d-flex align-items-center pt-2 pb-3 text-white text-decoration-none" >
                        <h4 class="ms-3 me-3 mb-0"><fa-icon :icon="['fas', 'wand-magic']" style="width: 2rem"></fa-icon></h4>
                        <h4 class="m-0">
                            {{ editor.name }} Config
                        </h4>
                        <button type="button" id="editClose" class="d-block d-sm-none ms-auto me-3 btn-close" data-bs-dismiss="offcanvas"></button>
                    </div>
                    <hr class="m-0">
                </div>
                <div id="basic" class="d-grid my-4 p-2 ps-4 pe-4" data-edit-class="small-stacked normal-wide large-wide">
                    <Image :src="editor.playlist" class="h-100 m-auto"></Image>
                    <div class="form-floating">
                        <input type="text" :class="`form-control${validName ? '':' is-invalid'}`" :value="editor.name" @input="syncBasic('name', $event.target?.value)">
                        <label>Playlist name</label>
                        <div :class="`mt-0 invalid-feedback${validName ? '':' d-block'}`">Playlist name cannot be empty.</div>
                        <button class="position-absolute top-0 end-0 btn action"
                                title="Reset"
                                @click="editor.resetConfig('name')">
                            <fa-icon class="text-secondary" :icon="['fas', 'rotate-left']"></fa-icon>
                        </button>
                    </div>
                    <div class="form-floating">
                        <textarea class="form-control h-100 rounded-2" :value="editor.description" @input="syncBasic('description', $event.target?.value)"></textarea>
                        <label>Description</label>
                        <button class="position-absolute top-0 end-0 btn action"
                                title="Reset"
                                @click="editor.resetConfig('name')">
                            <fa-icon class="text-secondary" :icon="['fas', 'rotate-left']"></fa-icon>
                        </button>
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
                        <h5 class="d-inline-flex flex-grow-1 mb-0">
                            <span class="py-2">
                                Sources
                            </span>
                            <Modal :button-icon="['far', 'circle-question']" button-class="btn action text-info">
                                <div class="modal-header">
                                    <h1 class="modal-title fs-5" id="exampleModalLabel">Sources</h1>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body">
                                    Sources dictate what data will be used to create the playlist. A source can be your library, an album, another playlist or a combination of these: you can add multiple sources to a playlist. As long as you have access to the source (e.g. a private playlist) you can use it as a source.
                                    <div class="alert alert-warning p-2 ps-3 mt-3">
                                        The amount of data which can be processed at a time is limited by the amount of requests Spotify allows. If you get stuck at <span class="text-info">"Applying filters"</span>, be patient, as retrying will not fix the issue.
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-info" data-bs-dismiss="modal">Alright</button>
                                </div>
                            </Modal>
                            <Modal :button-icon="['fas', 'rotate-left']" button-class="btn action text-secondary">
                                <div class="modal-header">
                                    <h1 class="modal-title fs-5" id="exampleModalLabel">Reset sources</h1>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body">
                                    This will reset the sources to the initial state. Are you sure you want to continue?
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">No</button>
                                    <button type="button" class="btn btn-danger" data-bs-dismiss="modal" @click="editor.resetConfig('sources')">Yes</button>
                                </div>
                            </Modal>
                        </h5>
                        <button class="btn action" @click="editor.addSource" title="Add a new source of tracks">
                            <fa-icon class="text-primary" :icon="['fas', 'plus']"></fa-icon>
                        </button>
                    </div>
                    <section v-if="editor.sources.length > 0" id="sources" class="flex-center align-items-center column-gap-3 mb-3">
                        <EditSource
                            v-for="source, index in editor.sources"
                            ref="sources"
                            :source="source"
                            @delete="editor.deleteSource(index)"></EditSource>
                    </section>
                    <div class="mt-4 d-flex">
                        <div class="flex-grow-1">
                            <div class="d-flex">
                                <h5 class="d-inline-flex flex-grow-1 mb-0">
                                    <span class="py-2">
                                        Filters
                                    </span>
                                    <Modal :button-icon="['far', 'circle-question']" button-class="btn action text-info">
                                        <div class="modal-header">
                                            <h1 class="modal-title fs-5" id="exampleModalLabel">Filters</h1>
                                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                        </div>
                                        <div class="modal-body">
                                            Filters are used to determine which tracks are included in the playlist, which come from the sources you specified. A filter can be a condition or a statement. Conditions apply a condition to for example a track or album. This allows you to select tracks based on their properties. Statements are used to combine conditions, as sometimes satisfying multiple conditions is required.

                                            <h4 class="mt-4">Statements</h4>
                                            Statements contain a subgroup of other statements and/or conditions. They have one field, the 'mode' field, which determines how the conditions are combined. For example, the 'all' mode requires all conditions to be satisfied, while the 'any' mode requires at least one condition to be satisfied.

                                            <div class="alert alert-primary p-2 ps-3 mt-2">
                                                A statement can be added by clicking the <fa-icon class="text-primary" :icon="['fas', 'code-branch']"></fa-icon> button
                                            </div>

                                            <h4 class="mt-4">Conditions</h4>
                                            Conditions are used to filter the items from the sources based on their properties, which are explained by clicking the <fa-icon class="text-secondary" :icon="['far', 'circle-question']"></fa-icon> icon. Some conditions allow for a text-based input. These inputs are smart and have the following features:
                                            <ol class="list-group list-group-numbered my-3">
                                                <li class="list-group-item d-flex justify-content-between align-items-start">
                                                    <div class="ms-2 me-auto">
                                                        <div class="fw-bold">
                                                            Use a comma to separate multiple values
                                                        </div>
                                                        Don't recreate the same filter with a different text value
                                                    </div>
                                                </li>
                                                <li class="list-group-item d-flex justify-content-between align-items-start">
                                                    <div class="ms-2 me-auto">
                                                        <div class="fw-bold">Use a wildcard (<span class="text-warning">*</span>) for a single word</div>
                                                        <span class="text-warning">* rock'</span> will include
                                                        <span class="text-info">instrumental rock</span>,
                                                        <span class="text-info">jazz rock</span> and
                                                        <span class="text-info">progressive rock</span>,
                                                        <u>but not <i>'rock'</i></u>
                                                    </div>
                                                </li>
                                                <li class="list-group-item d-flex justify-content-between align-items-start">
                                                    <div class="ms-2 me-auto">
                                                        <div class="fw-bold">Regex (regular expressions)</div>
                                                        The input is treated as a regular expression. For example, <span class="text-warning">^rock</span> will match all values starting with <span class="text-info">rock</span>. Note however that due to wildcard support, the <span class="text-warning">*</span> is not available.
                                                    </div>
                                                </li>
                                            </ol>
                                            <div class="alert alert-primary p-2 ps-3 mt-2">
                                                A condition can be added by clicking the <fa-icon class="text-primary" :icon="['fas', 'plus']"></fa-icon> button
                                            </div>
                                        </div>
                                        <div class="modal-footer">
                                            <button type="button" class="btn btn-info" data-bs-dismiss="modal">I see</button>
                                        </div>
                                    </Modal>
                                    <Modal :button-icon="['fas', 'rotate-left']" button-class="btn action text-secondary">
                                        <div class="modal-header">
                                            <h1 class="modal-title fs-5" id="exampleModalLabel">Reset filters</h1>
                                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                        </div>
                                        <div class="modal-body">
                                            This will reset the filters to the initial state. Are you sure you want to continue?
                                        </div>
                                        <div class="modal-footer">
                                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">No</button>
                                            <button type="button" class="btn btn-danger" data-bs-dismiss="modal" @click="editor.resetConfig('filters')">Yes</button>
                                        </div>
                                    </Modal>
                                </h5>
                                <button class="btn action" @click="editor.addFilter('condition')" title="Add a condition">
                                    <fa-icon class="text-primary" :icon="['fas', 'plus']"></fa-icon>
                                </button>
                                <button class="btn action" @click="editor.addFilter('statement')" title="Add a statement">
                                    <fa-icon class="text-primary" :icon="['fas', 'code-branch']"></fa-icon>
                                </button>
                            </div>
                            <div>
                                <small>(match <select class="source-select d-inline-flex form-select form-select-sm w-auto" @change="globalStatementChange">
                                <option v-for="mode in Object.keys(FilterParserOptions)" :value="mode" :selected="editor.filters.mode == mode">{{ mode }}</option>
                                </select> 1<sup>st</sup> level filters)</small>
                            </div>
                        </div>
                    </div>
                    <section v-if="editor.filters" id="filters" class="mb-5" data-edit-class="small-small normal-normal large-large">
                        <template v-for="entry in editor.flattened">
                            <EditStatement
                                v-if="entry.content.mode"
                                ref="filters"
                                :indent="entry.indent"
                                :statement="entry.content"
                                @change="editor.updateFilter($event, entry.index)"
                                @event="editor.eventFilter($event, entry.index)"></EditStatement>
                            <EditCondition
                                v-else
                                ref="filters"
                                :indent="entry.indent"
                                :condition="entry.content"
                                @change="editor.updateFilter($event, entry.index)"
                                @event="editor.eventFilter($event, entry.index)"></EditCondition>
                        </template>
                    </section>
                </div>
                <EditLog :hidden="!showLog"></EditLog>
                <div v-if="editor.error > 0" class="alert alert-primary" role="alert">
                    Some {{ editor.error == 1 ? 'sources' : editor.error == 2 ? 'filters' : 'filters and sources'}} are not filled in correctly
                </div>
                <hr>
                <small v-if="editor.id == 'example'" class="text-body-secondary mb-3">
                    'Save and apply filters' is disabled for the example automated playlist configuration
                </small>

                <section class="d-flex flex-wrap">
                    <div class="alert alert-primary" v-if="applyFiltersStuckMessage.show">
                        It is taking a long time to process your configuration. You can monitor the progress in the logs tab. You can also try to decrease the amount of filters or sources to speed up the process the next time.
                    </div>
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
                                                    {{ editor.exportConfig() }}
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
                                    <div class="modal-body d-flex flex-column">
                                        Import the configuration of this playlist by pasting the exported code beneath:
                                        <div>
                                            <textarea id="importConfigTextarea"
                                                      ref="importConfigTextarea"
                                                      class="w-100 border-0 bg-white text-black rounded-2 p-2 pe-1 mt-3"
                                                      style="height: 20rem;"
                                                      @focusout="checkImportConfig"
                                                      @keyup="checkImportConfig"
                                                      @paste="checkImportConfig"
                                            ></textarea>
                                        </div>
                                        <span v-if="importConfigValue !== '' && !validImportConfig" class="text-danger mt-2">
                                            Please enter a valid configuration
                                        </span>
                                    </div>
                                    <div class="modal-footer">
                                        <div class="me-auto">
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="importOption" id="importOption1" checked>
                                                <label class="form-check-label" for="importOption1">
                                                    Overwrite current config
                                                </label>
                                            </div>
                                            <div class="form-check">
                                                <input class="form-check-input" type="radio" name="importOption" id="importOption2">
                                                <label class="form-check-label" for="importOption2">
                                                    Append config to current
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
                    <button type="button" id="editSave" class="d-flex align-items-center btn btn-primary me-3 mt-3" @click="execute" :disabled="editor.id == 'example' || !validName || (saveState > 0 || executeState > 0)">
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
                    <Transition name="playlist-created">
                        <button v-if="playlistCreated" type="button" id="editReset" disabled class="btn btn-success mt-3 me-3">Playlist created!</button>
                    </Transition>
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
import Editor from '~/stores/editor';
import { FilterParserOptions } from '../../../backend/src/shared/types/descriptions';

export default class Edit extends Vue {
    playlists: Playlists = null as any;
    layout: Layout = null as any;
    editor: Editor = null as any;

    window = window
    FilterParserOptions = FilterParserOptions;

    /** Interval after which basic info change (name & description) will be synced */
    basicUpdateTimeout: any = 0;

    showLog = false;
    /** 0: default, 1: pending, 2: finished */
    saveState = 0;
    /** Interval after which a message will be displayed */
    applyFiltersStuckMessage: {
        timeout: NodeJS.Timeout;
        show: boolean;
    } = { timeout: null as any, show: false };
    /** 0: default, 1: pending, 2: finished */
    executeState = 0;
    /** 0: uncopied, 1: copied */
    copied = 0;
    /** 0: invalid config, 1: valid config */
    validImportConfig = false;
    /** Import config value */
    importConfigValue = '';
    /** 0: invalid name, 1: valid name */
    validName = true;
    /** Playlist succesfully created */
    playlistCreated = false;

    created() {
        if (!process.client) return;
        this.playlists = new Playlists();
        this.playlists.setUser(new User());
        this.editor = new Editor();
        this.editor.playlists = this.playlists;
    }

    beforeMount() {
        if (!process.client) return;
        this.layout = new Layout();
    }

    /** Updates the info of the playlist */
    async save() {
        if (this.executeState > 0) return false;

        this.editor.refs = this.$refs;
        this.saveState = 1;
        const result = await this.editor.save();
        this.saveState = 0;
        return result;
    }

    /** Executes the filters of the playlists */
    async execute() {
        if (this.saveState > 0 || this.executeState > 0) return false;
        this.playlists.editor.logs = [];

        // Save the playlist configuration
        if (!await this.save())
            return false;

        // Show a popup that the playlist has been created
        const was_unpublished = this.playlists.editor.id === 'unpublished';
        if (was_unpublished) {
            this.playlistCreated = true;
            setTimeout(() => this.playlistCreated = false, 2000);
        }

        this.executeState = 1;
        this.applyFiltersStuckMessage.timeout = setTimeout(() => {
            this.applyFiltersStuckMessage.show = true;
        }, 10000);

        await this.editor.execute();

        clearTimeout(this.applyFiltersStuckMessage.timeout);
        this.applyFiltersStuckMessage.show = false;
        this.executeState = 2;

        this.$forceUpdate();
        setTimeout(() => this.executeState = 0, 1000);
    }

    async syncBasic(kind: 'name' | 'description', value: string) {
        this.validName = !(kind == 'name' && value.length == 0);

        // Do not update the basic info if the data is the same
        if (this.playlists.editor[kind] == value) return;

        this.editor.updateBasic(kind, value);
    }

    globalStatementChange(event: Event) {
        this.editor.filters.mode = (event.target! as HTMLSelectElement).value as keyof typeof FilterParserOptions;
    }

    /**
     * Copy the configuration of the playlist
     */
    async copyConfig() {
        await navigator.clipboard.writeText(this.editor.exportConfig());
        this.copied = 1;
        setTimeout(() => this.copied = 0, 1000);
    }

    /**
     * Check if the import configuration is a valid configuration
     */
    checkImportConfig() {
        try {
            const textarea = this.$refs['importConfigTextarea'] as HTMLTextAreaElement;
            this.importConfigValue = textarea.value;
            JSON.parse(atob(textarea.value));
            this.validImportConfig = true;
        } catch (e) {
            this.validImportConfig = false;
        }
    }

    /**
     * Import the configuration of the playlist
     */
    async importConfig() {
        const textarea = this.$refs['importConfigTextarea'] as HTMLTextAreaElement;

        // Clear the UI for one tick
        this.editor.sources = [];
        this.editor.flattened = [];
        await this.$nextTick();

        // Import
        this.editor.importConfig(
            textarea.value,
            document.getElementById('importOption1')?.checked ? 'overwrite' : 'append'
        );
        this.importConfigValue = textarea.value = "";
        this.validImportConfig = false;
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
        gap: 1.2rem 2rem;
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

.playlist-created-enter-active,
.playlist-created-leave-active {
  transition: all 0.3s ease-out;
}

.playlist-created-enter-from,
.playlist-created-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}
</style>
