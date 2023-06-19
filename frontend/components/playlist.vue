<template>
    <article v-if="playlistStore && playlistStore.selectedPlaylist" class="rounded-2 p-2 bg-dark-subtle overflow-hidden">
        <div class="h-100 pe-1 overflow-y-auto">
            <Title>{{ playlistStore.selectedPlaylist.name }}</Title>
            <header class="p-4 pt-5 d-flex">
                <img :src="playlistStore.selectedPlaylist.image"/>
                <div class="flex-fill d-flex flex-column mb-2 ms-4">
                    <h1 class="column mt-auto">{{ playlistStore.selectedPlaylist.name }}</h1>
                    <h6 class="column mt-3 d-flex align-items-center flex-wrap gap-2">
                        <span class="text-nowrap">{{ playlistStore.selectedPlaylist.owner.display_name }}</span>
                        <span class="d-md-block d-none">━</span>
                        <template v-if="!loading">
                            {{ playlistStore.selectedPlaylist.matched_tracks.length }} track{{ playlistStore.selectedPlaylist.matched_tracks.length > 1 ? 's' : '' }}
                        </template>
                        <template v-else>
                            <span class="d-inline-block loading-icon"/> loading tracks
                        </template>
                    </h6>
                </div>
            </header>
            <div v-if="!loading" class="accordion accordion rounded-5">
                <Track v-for="t of playlistStore.selectedPlaylist.matched_tracks" :track="t" />
            </div>
        </div>
    </article>
</template>

<script lang="ts">
import { Prop, Vue } from 'vue-property-decorator';
import PlaylistStore from '~/stores/playlists';
import User from '~/stores/user';

export default class Playlist extends Vue {
    @Prop({ required: true }) id!: string;

    playlistStore!: PlaylistStore;
    loading: boolean = true;

    async created() {
        if (!process.client) return;
        this.playlistStore = new PlaylistStore(new User());
        await this.playlistStore.loadPlaylistByID(this.id);
        this.loading = false;
    }
}
</script>

<style lang="scss" scoped>
header {
    img {
        width: 230px;
        height: 230px;
    }
}

@include media-breakpoint-down(lg) {
    header {
        img {
            width: 190px;
            height: 190px;
        }
    }
}
</style>