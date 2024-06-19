<template>
    <select ref="source" class="source-select form-select form-select-md" @change="sourceChange">
        <option v-for="s in SourceDescription" :value="s" :selected="source.origin == s">{{ s }}</option>
    </select>
    <template v-if="kind == 'library'">
        <span>Tracks you liked</span>
        <span></span>
        <button class="border-0 bg-transparent p-2" @click="$emit('delete')"><fa-icon style="color: rgb(155, 0, 0)"
                :icon="['fas', 'trash-can']"></fa-icon></button>
    </template>
    <template v-else-if="kind == 'multiple' && (typeof source.value !== 'string')">
        <span style="grid-column: span 2"></span>
        <button class="border-0 bg-transparent p-2" @click="$emit('delete')"><fa-icon style="color: rgb(155, 0, 0)"
            :icon="['fas', 'trash-can']"></fa-icon></button>
        <template v-for="kind in ['track', 'artist', 'genre']">
            <h6 class="text-capitalize ms-5 mt-1" style="grid-column: span 4">{{ kind }}s</h6>
            <EditInput v-for="artist, index of source.value[`seed_${kind}s`]"
                    :key="artist"
                    :kind="kind"
                    :value="artist"
                    :removable="index < source.value[`seed_${kind}s`].length - 1"
                    @update="updateInput($event, `seed_${kind}s`, index)"
                    @remove="removeInput(`seed_${kind}s`, index)"
                    class="ms-5 mb-2"
                    style="grid-column: span 4"></EditInput>
        </template>
    </template>
    <template v-else>
        <span data-edit-class="small-two-layer">from</span>
        <EditInput data-edit-class="small-d-none large-d-block" :value="source.value" :kind="kind" @update="updateInput"></EditInput>
        <button class="border-0 bg-transparent p-2" @click="$emit('delete')"><fa-icon style="color: rgb(155, 0, 0)"
            :icon="['fas', 'trash-can']"></fa-icon></button>
        <EditInput data-edit-class="small-two-layer small-d-block normal-d-none large-d-none" :value="source.value" :kind="kind" @update="updateInput"></EditInput>
    </template>
</template>

<script lang="ts">
import { Vue, Prop, Emit } from 'vue-property-decorator';
import { PlaylistSource } from '../../../backend/src/shared/types/playlist';
import { SourceDescription as Sources } from '../../../backend/src/shared/types/descriptions';
import Info from '~/stores/info';
import EditInput from './input.vue';
import Layout from '~/stores/layout';
import Playlists from '~/stores/playlists';
import User from '~/stores/user';

@Emit('delete')
export default class EditSource extends Vue {
    @Prop({ required: true }) source!: PlaylistSource

    playlists: Playlists = null as any;
    info: Info = null as any;
    layout: Layout = null as any;
    SourceDescription = Object.keys(Sources);

    /** Multiple is not yet supported */
    kind: "album" | "artist" | "playlist" | "library" | "multiple" = "library"
    invalid = false;

    created() {
        this.info = new Info();
    }

    mounted() {
        this.layout = new Layout();
        this.layout.render(null, true);
        this.playlists = new Playlists();
        this.playlists.setUser(new User());
        this.getKind();
    }

    /**
     * Used externally to check if all the required fields are filled
     */
    isValid() {
        if (this.kind == 'multiple') {
            return this.source.value !== null && typeof this.source.value !== 'string' &&
                (this.source.value['seed_tracks'].length > 0
                    || this.source.value['seed_genres'].length > 0
                    || this.source.value['seed_artists'].length > 0);
        } else {
            return !this.invalid && this.source.value !== null &&
                (this.source.origin == "Library" ||
                 (this.source.value !== '' && this.source.value !== this.playlists.editing.id));
        }
    }

    /**
     * Changes the source origin itself, but might result in an incomplete value
     * @param event The selected new source
     */
    async sourceChange(event: Event) {
        this.source.origin = (event.target! as HTMLSelectElement).value as any;

        // If it is the library, we want to hide the input
        this.getKind();
        if (this.kind == 'multiple') {
            this.source.value = { 'seed_tracks': [''], 'seed_genres': [''], 'seed_artists': [''] }
        } else {
            this.source.value = '';
        }

        this.layout.render(null, true);
    }

    /**
     * Updates an input value
     * @param input The input component
     * @param kind  The kind of input to update. Null if it is the single input.
     * @param index The index of the kind of input to update. -1 if it is the single input.
     */
    async updateInput(input: EditInput, kind: any = null, index: number = -1) {
        if (kind == null) {
            if (input.id == this.playlists.editor.id) {
                input.isValid = false;
                input.error = "You can't use the playlist you are editing as a source"
                input.name = input.id;
                this.invalid = true;
                return;
            }

            this.invalid = false;
            this.source.value = input.id;
        } else {
            /** If this ID is already present */
            if (input.id !== '' && (this.source.value as any)[kind].includes(input.id) && index != (this.source.value as any)[kind].indexOf(input.id)) {
                input.isValid = false;
                input.error = "This ID is already present"
                input.name = input.id;
                this.invalid = true;
                return;
            }

            this.invalid = false;
            (this.source.value as any)[kind][index] = input.id;
            await this.$nextTick();

            /** If the user is allowed to id more inputs (max of 5) */
            if (input.id !== '' && index + 1 < 5 && (this.source.value as any)[kind][index + 1] === undefined) {
                (this.source.value as any)[kind].push('');
            }
        }
    }

    removeInput(kind: string, index: number = -1) {
        if (index >= 0) {
            (this.source.value as any)[kind].splice(index, 1);
        }
    }

    getKind() {
        switch (this.source.origin) {
            case "Library":
                this.kind = "library";
                break;

            case "Artist's Albums":
            case "Artist's Related Artists":
            case "Artist's Top Tracks":
            case "Artist's Tracks":
                this.kind = "artist";
                break;

            case "Playlist tracks":
                this.kind = "playlist";
                break;

            case "Recommendations":
                this.kind = "multiple";
                break;
        }
    }
}
</script>

<style lang="scss" scoped>
.source-select {
    height: fit-content;
}
span.two-layer {
    grid-column: span 2;
}
div.two-layer {
    grid-column: span 4;
    margin: 0 3rem;
}
</style>