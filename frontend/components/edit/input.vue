<template>
    <div>
        <div v-if="kind == 'genre'" class="d-flex gap-2">
            <select class="form-select form-select-md" @change="updateInput">
                <template v-if="genres">
                    <option v-for="genre in genres"
                        :value="genre"
                        :selected="id == genre">{{ genre }}</option>
                </template>
                <option v-else value="Loading genres...">Loading genres...</option>
            </select>
            <button v-if="removable" class="btn btn-danger" @click="$emit('remove')"><fa-icon :icon="['fas', 'trash-can']"></fa-icon></button>
        </div>
        <div v-else class="input-group">
            <url v-if="isValid"
                 :to="`/info/${kind}/${id}`"
                 @click="breadcrumbs.clear(); breadcrumbs.add(`/info/${kind}/${id}`, name)"
                 class="link-primary text-decoration-underline source-input form-control bg-body-secondary"
            >{{ name }}</url>
            <input v-else ref="input" @focusout="updateInput" @keyup="updateInput" type="text" class="source-input form-control" :placeholder="`Insert ${kind} ID`" :value="name"/>
            <button v-if="isValid" type="button" class="btn btn-primary" @click="edit">Edit</button>
            <button v-if="removable && (!isValid || name !== '')" class="btn btn-danger" @click="$emit('remove')"><fa-icon :icon="['fas', 'trash-can']"></fa-icon></button>
        </div>
        <div v-if="!isValid && error != ''" class="form-text">{{ error }}</div>
    </div>
</template>

<script lang="ts">
import { Vue, Prop, Emit } from 'vue-property-decorator';
import Fetch from '~/stores/fetch';
import { CTrack } from '../../../backend/src/shared/types/client';
import BreadCrumbs from '~/stores/breadcrumbs';
import { WatchStopHandle } from 'nuxt/dist/app/compat/capi';


@Emit('update')
@Emit('remove')
export default class EditInput extends Vue {
    @Prop({required: true}) kind!: "track" | "album" | "artist" | "playlist" | "genre";
    @Prop({required: false, default: ''}) value!: string;
    @Prop({required: false, default: false}) removable!: boolean;

    id: string = "";
    name: string = "";
    error: string = "";
    isValid: boolean = false;
    breadcrumbs: BreadCrumbs = null as any;

    EditInput = EditInput;
    watcher: WatchStopHandle = null as any;
    genres: string[] | null = null;

    async created() {
        this.id = this.value;
        this.breadcrumbs = new BreadCrumbs();

        try {
            const request = await Fetch.get<{genres: string[]}>(`spotify:/recommendations/available-genre-seeds`);
            if (request.status == 200)
                this.genres = ["Select genre", ...request.data.genres];
            else
                this.genres = ["Could not fetch genres"];
        } catch {}

        // Try and fix the input
        await this.findId();

        this.watcher = watch(() => this.value, async () => {
            this.id = this.value;
            await this.findId();
        })
    }

    async findId() {
        // If empty, reset the input
        if (this.id == '') {
            this.name    = "";
            this.error   = "";
            this.isValid = false;
            return;
        };

        /** If the input is a genre, we don't need to make a request
         * Else, get the name associated with the ID */
        if (this.kind == 'genre') {
            if (this.id == 'Select genre')
                this.isValid = false;
            else
                this.isValid = true;
        } else {
            try {
                const request = await Fetch.get<CTrack>(`spotify:/${this.kind}s/${this.id}`);

                // Check if the request was successful
                if (request.status == 200) {
                    this.name    = request.data.name;
                    this.error   = ""
                    this.isValid = true;
                } else {
                    this.error   = `Could not find ${this.kind} with ID '${this.id}'`;
                    this.name    = this.id;
                    this.isValid = false;
                }
            } catch {
                this.error   = `Failed to look up ${this.kind} with ID '${this.id}'`;
                this.name    = this.id;
                this.isValid = false;
                return;
            }
        }
    }

    async updateInput(event: Event | KeyboardEvent) {
        if ((event as KeyboardEvent).key && (event as KeyboardEvent).key !== 'Enter') return;

        this.id = (event.target as HTMLInputElement).value;
        await this.findId();

        if (this.isValid)
            this.$emit('update', this);
    }

    edit() {
        /** Reset the input */
        this.isValid = false;
        this.name = this.id;

        /** Wait for the DOM to update and place focus in the checkbox */
        this.$nextTick(() => {
            (this.$refs.input as HTMLInputElement).focus();
        })
    }

    beforeUnmount() {
        this.isValid = true;
        this.watcher();
    }
}
</script>
