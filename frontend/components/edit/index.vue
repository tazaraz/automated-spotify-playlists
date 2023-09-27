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
                        <input type="text" class="form-control" :value="playlists.editing.name" @input="editstate.name = $event.target?.value">
                        <label>Playlist name</label>
                    </div>
                    <div class="form-floating">
                        <textarea class="form-control h-100 rounded-2" :value="playlists.editing.description" @input="editstate.description = $event.target?.value"></textarea>
                        <label>Description</label>
                    </div>
                </div>
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
                    <h5 class="flex-grow-1">Filters</h5>
                    <button class="btn action" @click="editstate.addFilter('condition')">
                        <fa-icon class="text-primary" :icon="['fas', 'plus']"></fa-icon>
                    </button>
                    <button class="btn action" @click="editstate.addFilter('statement')">
                        <fa-icon class="text-primary" :icon="['fas', 'code-branch']"></fa-icon>
                    </button>
                </div>
                <section v-if="editstate.computedFilters" id="filters" class="overflow-x-auto mb-5" data-edit-class="small-small normal-normal large-large">
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
                <br>
                <br>
                <div v-if="editstate.error > 0" class="alert alert-primary" role="alert">
                    Some {{ editstate.error == 1 ? 'sources' : editstate.error == 2 ? 'filters' : 'filters and sources'}} are not filled in correctly
                </div>
                <hr>
                <section class="d-flex flex-wrap">
                    <button type="button" id="editSave" class="d-flex align-items-center btn btn-primary me-3 mt-3" data-bs-dismiss="offcanvas" @click="save">
                        <span>{{ saveState == 0 ? "Save" : saveState == 1 ? "Saving" : "Saved" }}</span>
                        <Image v-if="editstate.saving && editstate.error == 0 && saveState == 1" class="d-inline shadow-none ms-2" style="width: 1.5rem" src=""></Image>
                    </button>
                    <!-- <Image v-if="editstate.saving && editstate.error == 0" src=""></Image> -->

                    <button type="button" id="editSave" class="d-flex align-items-center btn btn-primary me-3 mt-3" data-bs-dismiss="offcanvas" @click="execute">
                        <span>{{ executeState == 0 ? "Run" : executeState == 1 ? "Running" : "Done" }}</span>
                        <Image class="d-inline shadow-none ms-2" style="width: 1.5rem" v-if="executeState == 1" src=""></Image>
                    </button>

                    <button type="button" id="editReset" class="btn btn-danger ms-auto mt-3 me-3" data-bs-dismiss="offcanvas" @click="editstate.reset">Reset</button>

                    <button type="button" id="editDiscard" class="btn btn-danger mt-3 text-nowrap" data-bs-dismiss="offcanvas" @click="(playlists.editing = undefined as any)">Discard changes</button>
                </section>
            </div>
        </template>
    </article>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import Playlists from '~/stores/playlists';
import User from '~/stores/user';
import Layout from '~/stores/layout';
import EditCondition from './condition.vue';
import EditStatement from './statement.vue';
import EditState from '~/stores/editstate';

export default class Edit extends Vue {
    playlists!: Playlists;
    layout!: Layout;
    editstate!: EditState;

    /** Item which is being dragged */
    draggingIndex: string = "";
    /** 0: default, 1: pending, 2: finished */
    saveState = 0;
    executeState = 0;

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
        this.saveState = 2;
        setTimeout(() => this.saveState = 0, 1000);
    }

    /** Executes the filters of the playlists */
    async execute() {
        if (this.saveState > 0) return;

        this.executeState = 1;
        await this.editstate.execute();
        this.executeState = 2;
        setTimeout(() => this.executeState = 0, 1000);
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
</style>
