<template>
    <div class="h-100 p-3 overflow-hidden flex-column align-items-center" data-edit-class="small-d-none normal-d-none large-d-none full-d-flex">
        <url class="d-flex fs-4" style="width: 3rem; cursor: pointer;" @click="layout.open('main')">
            <fa-icon class="m-auto" :icon="['fas', 'angles-right']" style="width: 2rem"></fa-icon>
        </url>
        <hr class="w-100">
        <h4 v-if="Array.isArray(item?.image)" class="mb-3"><fa-icon :icon="item.image"></fa-icon></h4>
        <Image v-else :src="item" class="mt-2 mb-4 w-100 h-auto"></Image>
        <slot></slot>
        <h4 class="text-nowrap m-0" style="writing-mode:vertical-rl; transform: rotate(180deg);">{{ item?.name }}</h4>
        <span v-if="type" class="mt-auto">{{ type }}</span>
    </div>
</template>

<script lang="ts">
import { Prop, Vue } from 'vue-property-decorator';
import { CTrack, CAlbum, CArtist, CPlaylist } from '../../backend/src/types/client';
import Layout from '~/stores/layout';

export default class SmallHeader extends Vue {
    @Prop({ required: true }) item!: CTrack | CAlbum | CArtist | CPlaylist
    layout!: Layout;
    type: "Track" | "Album" | "Artist" | "Playlist" | null = null;

    mounted() {
        if (!process.client) return;
        this.layout = new Layout();

        if (this.$route.fullPath.includes('track'))
            this.type = "Track";
        else if (this.$route.fullPath.includes('album'))
            this.type = "Album";
        else if (this.$route.fullPath.includes('artist'))
            this.type = "Artist";
        else if (this.$route.fullPath.includes('playlist'))
            this.type = "Playlist";
    }
}
</script>