<template>
    <article class="rounded-2 p-2 bg-dark-subtle overflow-hidden">
        <div v-if="playlists" class="h-100 pe-1 overflow-y-auto">
            <Title v-if="!playlist">Loading playlist</Title>
            <Title v-else>{{ playlist.name }}</Title>
                <Image :source="playlist" />
                <div class="flex-fill d-flex flex-column text-white">
                    <template v-if="!playlist">
                        <span class="mt-auto placeholder rounded-2" style="width: 15rem; height:2rem"></span>
                        <div class="mt-5 mb-3">
                            <span class="placeholder rounded-2" style="width: 5rem"></span>
                            &nbsp;&nbsp;━&nbsp;&nbsp;
                            <span class="placeholder rounded-2" style="width: 10rem"></span>
                        </div>
                    </template>
                    <template v-else>
                        <h1 class="mt-auto">{{ playlist.name }}</h1>
                        <div class="mt-3 d-flex align-items-center flex-wrap gap-2">
                            <span class="rounded-2">{{ playlist.owner.display_name }}</span>
                            &nbsp;&nbsp;━&nbsp;&nbsp;
                            <template v-if="loading">
                                <span class="d-inline-block loading-icon"></span>loading tracks
                            </template>
                            <span v-else >{{ playlist.matched_tracks.length }}
                                track{{ playlist.matched_tracks.length > 1 ? 's' : ''}}
                            </span>
                        </div>
                    </template>
                </div>
            </header>
            <slot></slot>
            <div v-if="!loading && playlist" class="accordion rounded-5">
                <Track v-for="t of playlist.matched_tracks" :track="t" />
            </div>
            <div v-else class="accordion rounded-5">
                <Track v-for="i of 10"/>
            </div>
        </div>
    </article>
</template>

<script lang="ts">
import { Prop, Vue } from 'vue-property-decorator';
import Fetch from '~/stores/fetch';
import Playlists, { Playlist, SelectedPlaylist } from '~/stores/playlists';
import User from '~/stores/user';

export default class PlaylistDisplay extends Vue {
    @Prop({ required: true }) id!: string;
    /* Passing this property overrides the default behaviour of loading the playlist based on its ID and the URL
     * and instead will always load the given selectedPlaylist */
    @Prop({ default: false }) selectedPlaylist!: SelectedPlaylist;

    playlist: Playlist | SelectedPlaylist | null = null;
    playlists!: Playlists;
    loading: boolean = true;

    async created() {
        if (!process.client) return;

        this.playlists = new Playlists(new User());
        await this.playlists.loadUserPlaylists();

        /* We must load tracks as CTracks, these cannot be string[] */
        // Load the library if we're on the library page
        if (this.$route.path == '/library')
            this.playlist = await this.playlists.loadUserLibrary();

        // Load the user playlist if we're supposed to show that
        else if (this.$route.path.startsWith('/playlist')) {
            const result = await this.playlists.loadUserPlaylistByID(this.id)
            if (result) this.playlist = result;
        }

        // Load a random playlist the user stumbled upon
        else {
            this.playlist = (await Fetch.get<Playlist>(`spotify:/playlist/${this.id}`)).data;
            this.loading = false;
            const tracks = await this.playlists.loadPlaylistTracks(this.playlist);
            this.playlist.matched_tracks = tracks.matched;
        }

        this.loading = false;
    }
}
</script>

<style lang="scss" scoped>
.image {
    box-shadow: 0 4px 60px rgba(0, 0, 0, .8);
    width: 230px;
    height: 230px;
}

@include media-breakpoint-down(lg) {
    .image {
        width: 190px;
        height: 190px;
    }
}
</style>