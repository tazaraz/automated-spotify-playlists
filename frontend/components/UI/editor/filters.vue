<template>
    <div class="overflow-x-auto">
        <div class="d-flex">
            <h5 class="d-inline-flex flex-grow-1 mb-0">
                <span class="py-2">
                    Sources
                </span>
                <Modal :button-icon="['far', 'circle-question']" button-class="btn text-info">
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
                <Modal :button-icon="['fas', 'rotate-left']" button-class="btn text-secondary">
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
            <button class="btn" @click="editor.addSource" title="Add a new source of tracks">
                <fa-icon class="text-primary" :icon="['fas', 'plus']"></fa-icon>
            </button>
        </div>
        <section v-if="editor.sources.length > 0" id="sources" class="flex-center align-items-center column-gap-3 mb-3">
            <UIEditorSource
                v-for="source, index in editor.sources"
                ref="sources"
                :source="source"
                @change="editor.updateSource(index, $event)"
                @delete="editor.deleteSource(index)"/>
        </section>
        <div class="mt-4 d-flex">
            <div class="flex-grow-1">
                <div class="d-flex">
                    <h5 class="d-inline-flex flex-grow-1 mb-0">
                        <span class="py-2">
                            Filters
                        </span>
                        <Modal :button-icon="['far', 'circle-question']" button-class="btn text-info">
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
                                            Don't recreate the same filter with a different text value. The matching is case insensitive and will be true if <span class="text-warning">at least one</span> of the values match.
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
                        <Modal :button-icon="['fas', 'rotate-left']" button-class="btn text-secondary">
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
                    <button class="btn" @click="editor.addFilter('condition')" title="Add a condition">
                        <fa-icon class="text-primary" :icon="['fas', 'plus']"></fa-icon>
                    </button>
                    <button class="btn" @click="editor.addFilter('statement')" title="Add a statement">
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
        <section v-if="editor.filters" id="filters" class="mb-5">
            <template v-for="entry in editor.flattened">
                <UIEditorStatement
                    v-if="entry.content.mode"
                    ref="filters"
                    :indent="entry.indent"
                    :statement="entry.content"
                    @change="editor.updateFilter($event, entry.index)"
                    @event="editor.eventFilter($event, entry.index)"></UIEditorStatement>
                <UIEditorCondition
                    v-else
                    :indent="entry.indent"
                    ref="filters"
                    :condition="entry.content"
                    @change="editor.updateFilter($event, entry.index)"
                    @event="editor.eventFilter($event, entry.index)"></UIEditorCondition>
            </template>
        </section>
    </div>
</template>

<script lang="ts">
import { Component, Vue, toNative } from 'vue-facing-decorator';
import { FilterParserOptions } from '@/../backend/src/shared/types/descriptions';
import Editor from '~/stores/editor';

@Component({})
class EditorFilters extends Vue {
    editor: Editor = null as any;

    /** The FilterParserOptions */
    FilterParserOptions = FilterParserOptions;

    created() {
        this.editor = new Editor();
    }

    updated() {
        // Every time the filters are updated, we need to update the refs
        this.editor.refs = {
            sources: this.$refs.sources as any,
            filters: this.$refs.filters as any,
        }
    }

    globalStatementChange(event: Event) {
        this.editor.filters.mode = (event.target! as HTMLSelectElement).value as keyof typeof FilterParserOptions;
    }
}

export default toNative(EditorFilters);
</script>

<style lang="scss" scoped>
#sources {
    display: grid;
    grid-template-columns: auto auto 5fr 2rem;
    gap: 0.5rem;
}

.filter-item {
    display: grid;
    grid-auto-rows: 40px;
}

#editor.large .filter-item {
    grid-template-columns: repeat(3, 1rem) max-content 1.5rem max-content 1.5rem 1fr repeat(3, 2rem);
}
#editor.normal .filter-item {
    grid-template-columns: repeat(3, 1rem) max-content 1.5rem 1fr 0 0 repeat(3, 2rem);
}
#editor.small .filter-item {
    grid-template-columns: repeat(3, 1rem) max-content 0 1fr 0 0 repeat(3, 2rem);
}
</style>