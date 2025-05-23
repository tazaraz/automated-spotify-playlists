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
    <template v-else>
        <span class="small-span-2">from</span>
        <UIEditorInput class="small-d-none large-d-flex" :value="source.value" :kind="kind"
                   @update="updateInput"></UIEditorInput>
        <button class="border-0 bg-transparent p-2"
                @click="$emit('delete')">
                <fa-icon style="color: rgb(155, 0, 0)" :icon="['fas', 'trash-can']"></fa-icon>
        </button>
        <UIEditorInput class="small-span-4 small-d-flex d-none" :value="source.value" :kind="kind"
                   @update="updateInput"></UIEditorInput>
    </template>
</template>

<script lang="ts">
import { Vue, Component, toNative, Prop } from 'vue-facing-decorator';
import { SourceDescription } from '@/../backend/src/shared/types/descriptions';
import { type PlaylistSource } from '@/../backend/src/shared/types/playlist';
import { EditorInput } from './input.vue';
import Layout from '~/stores/layout';
import Playlists from '~/stores/playlists';
import User from '~/stores/user';

@Component({
    emits: ['delete', 'change']
})
export class EditorSource extends Vue {
    @Prop({ required: true }) source!: PlaylistSource

    playlists: Playlists = null as any;
    layout: Layout = null as any;

    SourceDescription = Object.keys(SourceDescription);

    kind: "album" | "artist" | "playlist" | "library" = "library"
    valid = true;

    created() {
        this.getKind();
    }

    mounted() {
        this.layout = new Layout();
        this.playlists = new Playlists();
        this.playlists.setUser(new User());
    }

    updated() {
        this.getKind();
    }

    /**
     * Used externally to check if all the required fields are filled
     */
    isValid() {
        return this.valid && this.source.value !== null &&
            (this.source.origin == "Library" ||
                (this.source.value !== '' && this.source.value !== this.playlists.editor.id));
    }

    /**
     * Changes the source origin itself, but might result in an incomplete value
     * @param event The selected new source
     */
    async sourceChange(event: Event) {
        this.source.origin = (event.target! as HTMLSelectElement).value as any;

        // If it is the library, we want to hide the input
        this.getKind();
        this.source.value = '';
        this.$emit('change', this.source)
    }

    /**
     * Updates an input value
     * @param input The input component
     * @param kind  The kind of input to update. Null if it is the single input.
     * @param index The index of the kind of input to update. -1 if it is the single input.
     */
    async updateInput(input: EditorInput, kind: any = null, index: number = -1) {
        if (kind == null) {
            if (input.id == this.playlists.editor.id) {
                input.isValid = false;
                input.error = "You can't use the playlist you are editing as a source"
                input.name = input.id;
                this.valid = false;
                return;
            }

            this.valid = true;
            this.source.value = input.id;
        } else {
            /** If this ID is already present */
            if (input.id !== '' && (this.source.value as any)[kind].includes(input.id) && index != (this.source.value as any)[kind].indexOf(input.id)) {
                input.isValid = false;
                input.error = "This ID is already present"
                input.name = input.id;
                this.valid = false;
                return;
            }

            this.valid = true;
            (this.source.value as any)[kind][index] = input.id;
            await this.$nextTick();

            /** If the user is allowed to id more inputs (max of 5) */
            if (input.id !== '' && index + 1 < 5 && (this.source.value as any)[kind][index + 1] === undefined) {
                (this.source.value as any)[kind].push('');
            }
        }

        this.$emit('change', this.source)
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
        }
    }
}

export default toNative(EditorSource);
</script>

<style lang="scss" scoped>
#editor.small {
    .small-span-2 {
        grid-column: span 2;
    }
    .small-span-4 {
        grid-column: span 4;
        margin: 0 3rem;
    }
}
.source-select {
    height: fit-content;
}

</style>