<template>
    <article class="rounded-2 p-2 bg-dark-subtle overflow-hidden">
        <div v-if="playlists" class="h-100 pe-1 overflow-y-auto">
            <Title v-if="!playlists.loaded">Loading playlist</Title>
            <Title v-else>{{ playlists.loaded.name }}</Title>
            <header class="p-4 pt-5 d-flex gap-4 flex-column align-items-center align-items-lg-stretch" data-editing-class="flex-lg-row">
                <Image :source="playlists.loaded" />
                <div class="flex-fill d-flex flex-column text-white">
                    <template v-if="!playlists.loaded">
                        <span class="mt-auto placeholder rounded-2" style="width: 15rem; height:2rem"></span>
                        <div class="mt-5 mb-3">
                            <span class="placeholder rounded-2" style="width: 5rem"></span>
                            &nbsp;&nbsp;━&nbsp;&nbsp;
                            <span class="placeholder rounded-2" style="width: 10rem"></span>
                        </div>
                    </template>
                    <template v-else>
                        <h1 class="mt-auto">{{ playlists.loaded.name }}</h1>
                        <div class="mt-3 d-flex align-items-center flex-wrap gap-2">
                            <span class="rounded-2">{{ playlists.loaded.owner.display_name }}</span>
                            &nbsp;&nbsp;━&nbsp;&nbsp;
                            <template v-if="loading || !playlists.loaded || !playlists.loaded.matched_tracks">
                                <span class="d-inline-block loading-icon"></span>loading tracks
                            </template>
                            <span v-else >{{ playlists.loaded.matched_tracks.length }}
                                track{{ playlists.loaded.matched_tracks.length == 1 ? 's' : ''}}
                            </span>
                        </div>
                    </template>
                </div>
            </header>
            <slot></slot>
            <template>

            </template>
            <div v-if="!loading && playlists.loaded && shownTracks" class="accordion rounded-5">
                <Track v-for="track of shownTracks" :track="track" />
            </div>
            <div v-else class="accordion rounded-5">
                <Track v-for="i of 10"/>
            </div>
        </div>
    </article>
</template>

<script lang="ts">
import { Prop, Vue } from 'vue-property-decorator';
import BreadCrumbs from '~/stores/breadcrumbs';
import Fetch from '~/stores/fetch';
import Playlists, { CPlaylist, EditingPlaylist } from '~/stores/playlists';
import User from '~/stores/user';
import { CTrack } from '../../backend/src/types/client';

export default class PlaylistDisplay extends Vue {
    @Prop({ required: true }) id!: string;
    /**Passing this property overrides the default behaviour of loading the playlist based on its ID and the URL
     * and instead will always load the given editingPlaylist */
    @Prop({ default: false }) editingPlaylist!: EditingPlaylist;

    user: User = null;
    playlists: Playlists = null;
    breadcrumbs: BreadCrumbs = null

    loading: boolean = true;

    /**Tracks which should be shown. Only possible if the playlist is a smart playlist */
    shownTracks: CTrack[] = [];

    async mounted() {
        if (!process.client) return;

        this.user = new User();
        this.playlists = new Playlists();
        this.playlists.setUser(this.user)
        await this.playlists.loadUserPlaylists();
        this.breadcrumbs = new BreadCrumbs();

        /**We must load tracks as CTracks, these cannot be string[] */
        // Load the library if we're on the library page
        if (this.$route.path == '/library' || this.id == 'library')
            await this.playlists.loadUserLibrary();

        // Load the user playlist if we're supposed to show that
        else if (this.$route.path.startsWith('/playlist')) {
            await this.playlists.loadUserPlaylistByID(this.id)
        }

        // Load a random playlist the user stumbled upon
        else {
            const playlist = (await Fetch.get<CPlaylist>(`spotify:/playlists/${this.id}`)).data;
            playlist.image = Fetch.bestArtwork(playlist.images);
            this.loading = false;

            const tracks = await this.playlists.loadPlaylistTracks(playlist);
            playlist.matched_tracks = tracks.matched;
            this.playlists.loaded = playlist;
        }

        this.showTracks("matched");
        this.breadcrumbs.add(useRoute().fullPath, this.playlists.loaded.name)
        this.loading = false;
    }

    showTracks(kind: "matched" | "excluded" | "included") {
        // Make sure we have a playlist and that we can select the requested tracks
        if (!this.playlists.loaded || (!this.playlists.loaded.filters && (kind == 'excluded' || kind == 'included'))) return false;

        // Get the tracks we want to show
        let tracks: any[];
        switch(kind) {
            case "matched":
                tracks = this.playlists.loaded.matched_tracks;
                break;
            case "excluded":
                tracks = this.playlists.loaded.excluded_tracks;
                break;
            case "included":
                tracks = this.playlists.loaded.included_tracks;
                break;
        }

        // If these tracks are not loaded yet, stop
        if (tracks.length == 0 || typeof tracks[0] === `string`) return false;

        // Set the tracks as shown
        this.shownTracks = tracks;
        return true;
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