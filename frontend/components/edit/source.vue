<template>
    <select ref="source" class="form-select form-select-sm" aria-label=".form-select-sm example">
        <option v-for="source in Object.keys(SourceDescription)" :value="source">{{ source }}</option>
    </select>
    <template v-if="!isLibrary">
        <span>from</span>
        <div class="input-group">
            <input ref="input" type="text" class="form-control" placeholder="Type a query or an ID" />
        </div>
        <select ref="source" class="form-select form-select-sm" aria-label=".form-select-sm example">
            <template v-if="results.length > 0">
                <option v-for="source in Object.keys(SourceDescription)" :value="source">{{ source }}</option>
            </template>
            <option>Try the advanced search and input the ID</option>
        </select>
    </template>
        <!-- <dropdown v-if="results" ref="search" @click="updateSource" @close="updateSource">
            <template v-if="results.length > 0">
                <li v-for="result in results"
                    :data-id="result.id">
                    {{ result.name }}
                </li>
            </template>
            <template v-else>
                <li>Spotify came back empty handed...</li>
            </template>
        </dropdown> -->
    <!-- </span> -->
    <!-- <span v-if="!isLibrary"></span> -->
    <span class="pe-text" style="grid-column: span 7;">Tracks you liked</span>
    <Button class="delete-icon" @click="$emit('event', 'delete')"></Button>
</template>

<script lang="ts">
import { Vue, Prop } from 'vue-property-decorator';
import { PlaylistSource } from '../../../backend/src/types/playlist';
import { SourceDescription } from '../../../backend/src/types/descriptions';
import Info, { InfoItem } from '~/stores/info';


export default class EditSoutce extends Vue {
    @Prop({required: true}) source!: PlaylistSource

    info!: Info;

    SourceDescription = SourceDescription;

    isLibrary = false;
    results: InfoItem[] = [];

    created() {
        this.info = new Info();
    }
}
</script>

<style lang="scss" scoped>
</style>