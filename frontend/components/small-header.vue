<template>
    <div class="h-100 p-3 overflow-hidden flex-column align-items-center d-none" data-edit-class="tiny-d-none small-d-none normal-d-none large-d-none full-d-flex">
        <url class="d-flex fs-4" style="width: 3rem; cursor: pointer;" @click="layout.open('main')">
            <fa-icon class="m-auto" :icon="['fas', 'angles-right']" style="width: 2rem"></fa-icon>
        </url>
        <hr class="w-100">
        <h4 v-if="Array.isArray(item?.image)" class="mb-3"><fa-icon :icon="item.image"></fa-icon></h4>
        <Image v-else :src="item" class="mt-2 mb-4 w-100 h-auto"></Image>
        <slot></slot>
        <h4 class="text-truncate m-0" style="writing-mode:vertical-rl; transform: rotate(180deg);">{{ item?.name }}</h4>
        <span v-if="type" class="mt-auto pt-3">{{ type }}</span>
    </div>
</template>

<script lang="ts">
import { Prop, Vue } from 'vue-property-decorator';
import { CTrack, CAlbum, CArtist, CPlaylist } from '../../backend/src/shared/types/client';
import Layout from '~/stores/layout';

/**
 * This component is used to display a info field when the view itself is collapesed into its smallest form.
 */
export default class SmallHeader extends Vue {
    @Prop({ required: true }) item!: CTrack | CAlbum | CArtist | CPlaylist
    layout: Layout = null as any;
    type: "Track" | "Album" | "Artist" | "Playlist" | "User" | null = null;

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
        else if (this.$route.fullPath.includes('user'))
            this.type = "User";
    }
}
</script>