<template>
    <article class="rounded-2 p-2 bg-dark-subtle flex-grow-1 overflow-hidden">
        <template v-if="playlists">
            <SmallHeader :item="playlists.loaded"></SmallHeader>
            <div class="h-100 pe-1 overflow-y-auto" data-edit-class="full-d-none">
                <Title v-if="!playlists.loaded">Loading playlist</Title>
                <Title v-else>{{ playlists.loaded.name }}</Title>
                <header class="p-4 pt-5 d-flex gap-4 mb-3" data-main-class="normal-flex-row normal-align-items-stretch tiny-flex-column tiny-align-items-center">
                    <Image :src="playlists.loaded" class="m-auto"/>
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
                            <span v-if="!playlists.loaded.filters">Smart playlist</span>
                            <div class="mt-3 d-flex align-items-center flex-wrap gap-2">
                                <url :to="`/info/user/${playlists.loaded.owner.id}`" class="rounded-2">{{ playlists.loaded.owner.display_name }}</url>
                                &nbsp;&nbsp;━&nbsp;&nbsp;
                                <template v-if="loading || !playlists.loaded || !playlists.loaded.all_tracks">
                                    <span class="d-inline-block loading-icon"></span>loading tracks
                                </template>
                                <span v-else >{{ playlists.loaded.all_tracks.length }}
                                    track{{ playlists.loaded.all_tracks.length == 1 ? '' : 's'}}
                                </span>
                            </div>
                            <span v-if="playlists.loaded.id != 'unpublished' && playlists.loaded.id != 'library'">ID: {{ playlists.loaded.id }}</span>
                        </template>
                    </div>
                </header>
                <template v-if="playlists && playlists.loaded">
                    <div class="d-flex align-items-center rounded-3 bg-body-tertiary ps-3 pe-3 pt-2 pb-2 mb-3">
                        <button v-if="playlists.loaded.filters" class="btn btn-primary d-inline-flex" @click="setEditedPlaylist(playlists.loaded.id)">
                            <h5 class="m-0 me-2"><fa-icon :icon="['fas', 'wand-magic']" /></h5>
                            Edit config
                        </button>
                        <button v-if="playlists.loaded.ownership == 'following'" class="d-flex border-0 bg-transparent p-2" @click="unfollow">
                            <fa-icon style="font-size: 150%;" :icon="['fas', 'heart']"></fa-icon>
                        </button>
                        <button v-else-if="playlists.loaded.ownership == 'none'" class="d-flex border-0 bg-transparent p-2" @click="follow">
                            <fa-icon style="font-size: 150%;" :icon="['far', 'heart']"></fa-icon>
                        </button>
                        <Modal v-else-if="playlists.loaded.ownership == 'user'" :button="['fas', 'trash-can']" button-style="margin-left: 0.5rem; font-size: 120%; color: rgb(155, 0, 0)">
                            <div class="modal-header">
                                <h1 class="modal-title fs-5" id="exampleModalLabel">Delete</h1>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                This will delete the smart playlist and remove it in spotify. Are you sure?
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">No</button>
                                <button type="button" class="btn btn-danger">Yes</button>
                                <!-- <button type="button" class="btn btn-primary" @click="remove">Confirm</button> -->
                            </div>
                        </Modal>

                        <div v-if="playlists.loaded.filters" class="dropdown ms-auto">
                            <button class="btn" type="button" data-bs-toggle="dropdown">
                                <h5 class="m-0"><fa-icon :icon="['fas', 'arrow-down-wide-short']" /></h5>
                            </button>
                            <ul ref="shownTracksSelect" class="dropdown-menu">
                                <li><url class="dropdown-item active" @click="showTracks('all')">
                                    All tracks ({{ playlists.loaded.all_tracks?.length }})
                                </url></li>
                                <li><url class="dropdown-item" @click="showTracks('matched')">
                                    Matched tracks ({{ playlists.loaded.matched_tracks?.length }})
                                </url></li>
                                <li><url class="dropdown-item" @click="showTracks('excluded')">
                                    Manually excluded tracks ({{ playlists.loaded.excluded_tracks?.length }})
                                </url></li>
                                <li><url class="dropdown-item" @click="showTracks('included')">
                                    Manually included tracks ({{ playlists.loaded.included_tracks?.length }})
                                </url></li>
                            </ul>
                        </div>
                    </div>
                </template>
                <div v-if="!loading && playlists.loaded && shown.tracks" class="accordion rounded-5">
                    <Track v-for="track of shown.tracks" :track="track" :deleteable="shown.kind !== 'all'" @delete="removeTrack" />
                    <h4 v-if="shown.tracks.length == 0" class="m-5">
                        No tracks here.
                    </h4>
                </div>
                <div v-else class="accordion rounded-5">
                    <Track v-for="i of 10"/>
                </div>
            </div>
        </template>
    </article>
</template>

<script lang="ts">
import { Prop, Vue } from 'vue-property-decorator';
import BreadCrumbs from '~/stores/breadcrumbs';
import Fetch from '~/stores/fetch';
import Playlists, { LoadedPlaylist } from '~/stores/playlists';
import User from '~/stores/user';
import { CTrack } from '../../backend/src/types/client';
import Layout from '~/stores/layout';

export default class PlaylistDisplay extends Vue {
    @Prop({ required: true }) id!: string;
    /**Passing this property overrides the default behaviour of loading the playlist based on its ID and the URL
     * and instead will always load the given editingPlaylist */
    @Prop({ default: false }) editingPlaylist!: LoadedPlaylist;

    playlists: Playlists = null as any;
    breadcrumbs: BreadCrumbs = null as any;
    layout: Layout = null as any;

    loading: boolean = true;

    /**Tracks which should be shown. Only possible if the playlist is a smart playlist */
    shown: {
        kind: "all" | "matched" | "excluded" | "included";
        tracks: CTrack[];
    } = { kind: "all", tracks: [] };

    async mounted() {
        if (!process.client) return;

        this.playlists = new Playlists();
        this.playlists.setUser(new User())
        await this.playlists.loadUserPlaylists();
        this.breadcrumbs = new BreadCrumbs();
        this.layout = new Layout();

        /** Style the loading placeholders accordingly */
        await this.layout.render(null, true);

        /**We must load tracks as CTracks, these cannot be string[] */
        // Load the library if we're on the library page
        if (this.$route.path == '/library' || this.id == 'library') {
            await this.playlists.loadUserLibrary();
        }

        // Load the user playlist if we're supposed to show that
        else if (this.$route.path.startsWith('/playlist')) {
            if (!(await this.playlists.loadUserPlaylistByID(this.id))){
                return this.$router.push(`/info/playlist/${this.id}`);
            }
        }

        // Load a random playlist the user stumbled upon
        else {
            const playlist = (await Fetch.get<LoadedPlaylist>(`spotify:/playlists/${this.id}`)).data;
            playlist.image = Fetch.bestImage(playlist.images);
            playlist.ownership = this.playlists.playlistOwnership(playlist);
            this.playlists.loaded = playlist;

            const tracks = await this.playlists.loadPlaylistTracks(playlist as any);
            playlist.all_tracks = tracks.all;
            this.playlists.loaded = playlist;
        }

        this.showTracks("all");
        this.breadcrumbs.add(useRoute().fullPath, this.playlists.loaded.name)
        this.loading = false;
        await this.layout.render(null, true);
    }

    showTracks(kind: "all" | "matched" | "excluded" | "included") {
        // Make sure we have a playlist and that we can select the requested tracks
        if (!this.playlists.loaded || (!this.playlists.loaded.filters && (kind == 'excluded' || kind == 'included')))
            return false;

        // Get the tracks we want to show
        let tracks: any[];
        switch(kind) {
            case "all":
                tracks = this.playlists.loaded.all_tracks;
                break;
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
        if (tracks.length > 0 && typeof tracks[0] === `string`) return false;

        // Set the tracks as shown
        this.shown = { kind, tracks };

        // Make sure we have the tracks select element
        if (!this.$refs.shownTracksSelect)
            return false;

        // Apply CSS
        for (const item of this.$refs.shownTracksSelect.children) {
            item.children[0].classList.remove("active");
        }

        const shownTracksSelect = this.$refs.shownTracksSelect.children[kind == "all" ? 0 : kind == "matched" ? 1 : kind == "excluded" ? 2 : 3];
        shownTracksSelect.children[0].classList.add("active");

        return true;
    }

    removeTrack(track: CTrack) {
        switch (this.shown.kind) {
            case "all": break;
            case "matched":
                this.playlists.removeMatched(track)
                break;
            case "excluded":
                this.playlists.removeExcluded(track)
                break;
            case "included":
                this.playlists.removeIncluded(track)
                break;
        }

        this.showTracks(this.shown.kind)
    }

    async setEditedPlaylist(id: string) {
        await this.playlists.loadEditingPlaylist(id);
        this.showTracks("all");
        // Click the edit button to try and open the offcanvas edit view
        document.getElementById("toolbar")?.lastChild?.lastChild?.click();
        this.layout.render(null, true)
    }

    remove() {
        this.playlists.delete(this.playlists.loaded)
        this.$router.push("/library");
    }

    unfollow() {
        this.playlists.unfollow(this.playlists.loaded)
        this.playlists.loaded.ownership = "none";
    }

    follow() {
        this.playlists.follow(this.playlists.loaded)
        this.playlists.loaded.ownership = "following";
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