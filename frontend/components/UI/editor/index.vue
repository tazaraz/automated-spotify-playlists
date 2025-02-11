<template>
    <div id="editor" :class="`${offcanvas ? 'offcanvas offcanvas-end w-100':''} bg-black d-flex flex-column overflow-hidden h-100`">
        <div class="p-3 bg-dark h-100 overflow-hidden pe-2">
            <div class="overflow-y-auto h-100 pe-2 mx-auto" style="max-width: 50rem;">
                <div class="position-sticky bg-dark z-3" style="top: -0.25rem;">
                    <div class="d-flex align-items-center pt-2 pb-3 text-white text-decoration-none" >
                        <h4 class="mx-3 mb-0"><fa-icon :icon="['fas', 'wand-magic']" style="width: 2rem"></fa-icon></h4>
                        <h4 class="m-0">
                            {{ editor.name }} Config
                        </h4>
                        <button v-if="offcanvas" class="btn-close p-2 ms-auto my-auto" @click="hideOffcanvas"></button>
                    </div>
                    <hr class="my-0">
                </div>

                <div id="basic" class="stacked wide large-wide d-grid my-4 p-2 ps-4 pe-4">
                    <Image :src="editor?.playlist?.image || 'none'" class="image m-auto"/>
                    <div class="form-floating">
                        <input type="text" :class="`form-control${state.error.name ? ' is-invalid':''}`"
                               :value="editor.name"
                               @input="syncBasic('name', $event)">
                        <label>Playlist name</label>
                        <div :class="`mt-0 invalid-feedback${state.error.name ? ' d-block':''}`">
                            Playlist name cannot be empty.
                        </div>
                        <button class="position-absolute top-0 end-0 btn"
                                title="Reset"
                                @click="editor.resetConfig('name')">
                            <fa-icon class="text-secondary" :icon="['fas', 'rotate-left']"></fa-icon>
                        </button>
                    </div>
                    <div class="form-floating">
                        <textarea class="form-control h-100 rounded-2" :value="editor.description"
                                  @input="syncBasic('description', $event)"></textarea>
                        <label>Description</label>
                        <button class="position-absolute top-0 end-0 btn"
                                title="Reset"
                                @click="editor.resetConfig('name')">
                            <fa-icon class="text-secondary" :icon="['fas', 'rotate-left']"></fa-icon>
                        </button>
                    </div>
                </div>

                <ul class="nav nav-tabs mb-3">
                    <li class="nav-item">
                        <div :class="`nav-link d-flex ${display=='filters'?' active':''}`" role='button'
                             @click="display = 'filters'" >Configuration</div>
                    </li>
                    <li class="nav-item">
                        <div :class="`nav-link d-flex ${display=='logs'?' active':''}`" role='button'
                             @click="display = 'logs'">
                            Filter log
                            <div v-if="state.processing & PS.EXECUTING" class="spinner-border spinner-border-sm ms-2 my-auto" role="status"></div>
                        </div>
                    </li>
                </ul>

                <UIEditorFilters v-if="display == 'filters'" />
                <UIEditorLogs v-else-if="display == 'logs'" />

                <footer class="d-grid">
                    <div v-if="editor.error != EE.NONE" class="alert alert-info" role="alert">
                        <span v-if="editor.error & EE.NO_SOURCES">
                            You need to add at least one source!
                        </span>
                        <span v-else-if="editor.error & (EE.SOURCE | EE.FILTER)">
                            Some {{ editor.error & EE.SOURCE & EE.FILTER ? 'filters and sources' :
                                    editor.error & EE.SOURCE ? 'sources' :
                                    editor.error & EE.FILTER ? 'filters' :
                                    ''}} are not filled in correctly
                        </span>
                    </div>
                    <hr>
                    <small v-if="state.processing & PS.DISABLED" class="text-body-secondary mb-3">
                        'Save and apply filters' is disabled for the example automated playlist configuration
                    </small>

                    <div class="d-flex">
                        <div class="d-flex align-items-end dropdown">
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
                                            <button type="button" class="btn btn-secondary" @click="copyConfig()" :disabled="state.copied">
                                                {{ state.copied ? 'Copied' : 'Copy' }}
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
                                                            @input="checkImportConfig"
                                                            @paste="checkImportConfig"
                                                ></textarea>
                                            </div>
                                            <span v-if="!configImport.valid" class="text-danger mt-2">
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
                                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal" @click="importConfig" :disabled="!configImport.valid">Import</button>
                                        </div>
                                    </Modal>
                                </li>
                            </ul>
                        </div>
                        <button id="process"
                                class="btn btn-primary ms-auto"
                                @click="process" :disabled="state.processing != PS.NONE || state.error.name || (!editor.configChanged && editor.id !== 'unpublished')">
                            <div class="d-flex">
                                <Transition name="process" mode="out-in">
                                    <span v-if="state.processing & PS.CREATING">
                                        Creating playlist
                                        <div class="spinner-border spinner-border-sm ms-2 my-auto" role="status"></div>
                                    </span>
                                    <span v-else-if="state.processing & PS.CREATED">
                                        Playlist created
                                    </span>
                                    <span v-else-if="state.processing & PS.SAVING">
                                        Saving
                                        <div class="spinner-border spinner-border-sm ms-2 my-auto" role="status"></div>
                                    </span>
                                    <span v-else-if="state.processing & PS.SAVED">
                                        Saved
                                    </span>
                                    <span v-else-if="state.processing & PS.EXECUTING">
                                        Applying filters
                                        <div class="spinner-border spinner-border-sm ms-2 my-auto" role="status"></div>
                                    </span>
                                    <span v-else-if="state.processing & PS.EXECUTED">
                                        Done
                                    </span>
                                    <span v-else>
                                        {{ editor.id == 'unpublished' ? 'Create playlist' : 'Save' }} and apply filters
                                    </span>
                                </Transition>
                            </div>
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Offcanvas } from 'bootstrap';
import { Component, Vue, toNative, Prop } from 'vue-facing-decorator';
import Playlists from '~/stores/playlists';
import User from '@/stores/user';
import Editor, { EditorError } from '~/stores/editor';
import Layout from '~/stores/layout';


enum ProcessingState {
    NONE        = 0b0000000,
    DISABLED    = 0b0000001,
    CREATING    = 0b0000010,
    CREATED     = 0b0000100,
    SAVING      = 0b0001000,
    SAVED       = 0b0010000,
    EXECUTING   = 0b0100000,
    EXECUTED    = 0b1000000,
}


@Component({})
class UIEditor extends Vue {
    offcanvas: Offcanvas | null = null;
    playlists: Playlists = null as any;
    user: User = null as any;
    layout: Layout = null as any;
    editor: Editor = null as any;

    /** Which tab to display in the editor */
    display: 'filters' | 'logs' = 'filters';

    /** The process state */
    PS = ProcessingState;
    /** The editor error state */
    EE = EditorError;

    state: {
        processing: ProcessingState,
        error: {
            name: boolean,
            importConfig: boolean,
        },
        copied: boolean,
        stuck: boolean,
        /** Timeout for notifications to disappear */
        timeout: NodeJS.Timeout | null,
    } = {
        processing: ProcessingState.NONE,
        error: {
            name: false,
            importConfig: false,
        },
        copied: false,
        stuck: false,
        timeout: null,
    };

    configImport: {
        value: string,
        valid: boolean,
    } = { value: "", valid: false }

    beforeMount() {
        this.playlists = new Playlists();
        this.user = new User();
        this.layout = new Layout();
        this.editor = new Editor();

        if (this.layout.app.mobile) {
            this.createOffcanvas().then(() => {
                this.openOffcanvas();
            });
        }

        this.parseEditorId();
    }

    async process() {
        if (this.state.processing != this.PS.NONE) return;

        // Save the playlist
        this.state.processing = this.editor.id == 'unpublished' ? this.PS.CREATING : this.PS.SAVING;
        await this.editor.save();
        this.state.processing = this.editor.id == 'unpublished' ? this.PS.CREATED : this.PS.SAVED;

        // Check if there was an error
        if (this.editor.error != this.EE.NONE)
            return this.state.processing = this.PS.NONE;

        // Visual state feedback
        await new Promise(resolve => setTimeout(resolve, 500));

        // State transition
        this.state.processing = this.PS.EXECUTING;
        const stuck = setTimeout(() => { this.state.stuck = true }, 10000);

        // Apply the filters
        await this.editor.execute();

        // State transition
        clearTimeout(stuck);
        this.state.stuck = false;
        this.state.processing = this.PS.EXECUTED;

        // Visual state feedback
        setTimeout(() => { this.state.processing = this.PS.NONE }, 2000);
    }

    async syncBasic(kind: 'name' | 'description', event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.state.error.name = kind == 'name' && value.length == 0;

        // Do not update the basic info if the data is the same
        if (this.playlists.editor[kind] == value) return;

        this.editor.updateBasic(kind, value);
    }

    /**
     * Copy the configuration of the playlist
     */
     async copyConfig() {
        await navigator.clipboard.writeText(this.editor.exportConfig());
        this.state.copied = true;
        setTimeout(() => this.state.copied = false, 1000);
    }

    /**
     * Check if the import configuration is a valid configuration
     */
    checkImportConfig() {
        try {
            const textarea = this.$refs['importConfigTextarea'] as HTMLTextAreaElement;
            this.configImport.value = textarea.value;
            JSON.parse(atob(textarea.value));

            // Passed parse check. Now check if the textarea is not empty
            this.configImport.valid = textarea.value.length > 0;
        } catch (e) {
            this.configImport.valid = false;
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
            (document.getElementById('importOption1') as HTMLInputElement)?.checked ? 'overwrite' : 'append'
        );
        this.configImport.value = textarea.value = "";
        this.configImport.valid = false;
    }

    parseEditorId() {
        const updateEditorId = () => {
            switch (this.editor.id) {
                case 'example':
                    this.state.processing = this.PS.DISABLED;
                    break;
                default:
                    this.state.processing = this.PS.NONE;
                    break;
            }
        }

        updateEditorId();
        watch(() => this.editor.id, updateEditorId);
    }

    async createOffcanvas() {
        if (!this.offcanvas) {
            // Ensure the element is rendered
            await this.$nextTick();
            this.offcanvas = new Offcanvas(document.getElementById('editor')!);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    async openOffcanvas() {
        await this.createOffcanvas();
        // Toggle the offcanvas
        this.offcanvas!.show();
    }

    hideOffcanvas() {
        this.offcanvas?.hide();
    }

    async unmountOffcanvas() {
        if (!this.offcanvas) return;
        this.offcanvas?.dispose();
        this.offcanvas = null;
    }
}

export default toNative(UIEditor);
</script>


<style lang="scss" scoped>
.image {
    width: 190px;
    height: 190px;
    object-position: 50% 50%;
    object-fit: cover;
    box-shadow: 0 4px 60px rgba(0, 0, 0, 0.8);
}

#editor.small {
    #basic.stacked {
        grid-template-rows: 190px 60px calc(130px - 2rem);
        grid-template-columns: 100%;
        gap: 2rem;
        max-width: 25rem;
        margin: auto;
    }
}

#editor.normal,
#editor.large {
    #basic.wide {
        grid-template-rows: 60px calc(130px - 1rem);
        grid-template-columns: 190px 1fr;
        gap: 1.2rem 2rem;
        max-width: 40rem;
        margin: auto;

        :first-child {
            grid-row: span 2;
        }
    }
}

.process-enter-active,
.process-leave-active {
    transition: all 0.25s ease-out;
}

.process-enter-from {
    opacity: 0;
    transform: translateX(10px);
}

.process-leave-to {
    opacity: 0;
    transform: translateX(-10px);
}
</style>