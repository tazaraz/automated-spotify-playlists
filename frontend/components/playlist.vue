<template>
    <article class="rounded-2 p-2 bg-dark-subtle flex-grow-1 overflow-hidden">
        <template v-if="playlists">
            <SmallHeader :item="playlists.loaded"></SmallHeader>
            <div id="playlist-wrapper" class="h-100 overflow-y-auto overflow-hidden" data-edit-class="full-d-none">
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
                            <span>{{ playlists.loaded.description }}</span>
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
                            <span v-if="playlists.loaded.filters">Automated playlist</span>
                        </template>
                    </div>
                </header>
                <div v-if="playlists && playlists.loaded" class="d-flex flex-wrap rounded-3 bg-body-tertiary ps-3 pe-3 pt-2 pb-2 mb-3">
                    <button v-if="playlists.loaded.ownership == 'following'" class="d-flex border-0 bg-transparent p-2 ps-3 p-1 me-auto" @click="unfollow">
                        <fa-icon style="font-size: 150%;" :icon="['fas', 'heart']"></fa-icon>
                    </button>
                    <button v-else-if="playlists.loaded.ownership == 'none'" class="d-flex border-0 bg-transparent p-2 ps-3 p-1 me-auto" @click="follow">
                        <fa-icon style="font-size: 150%;" :icon="['far', 'heart']"></fa-icon>
                    </button>
                    <Modal v-else-if="playlists.loaded.ownership == 'user'" :button-icon="['fas', 'trash-can']" button-class="modal-delete ps-3 p-1 me-auto">
                        <div class="modal-header">
                            <h1 class="modal-title fs-5" id="exampleModalLabel">Delete</h1>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div v-if="playlists.loaded.filters" class="modal-body">
                            This will delete the automated playlist and remove it in spotify. People following the playlist will still have it, however it will not be updated anymore.
                        </div>
                        <div v-else class="modal-body">
                            This will remove the playlist from spotify. People following the playlist will still have it.
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" data-bs-dismiss="modal" @click="remove">Delete</button>
                        </div>
                    </Modal>

                    <Modal v-if="shown.kind != 'all' && shown.kind != 'matched' && shown.tracks.length > 0" :button-text="`Clear ${shown.kind} tracks`" button-class="btn btn-secondary text-nowrap me-3">
                        <div class="modal-header">
                            <h1 class="modal-title fs-5" id="exampleModalLabel">Clear all {{ shown.kind }} tracks?</h1>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            This operation will clear the {{ shown.kind }} list and {{ shown.kind == 'excluded' ? 'include' : 'exclude' }} all {{ shown.tracks.length }} tracks again.
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-danger" data-bs-dismiss="modal" @click="clearShownTracks">Yes</button>
                        </div>
                    </Modal>

                    <template v-if="playlists.loaded.filters !== undefined && playlists.loaded.ownership == 'user'">
                        <button v-if="!playlists.editing || playlists.loaded.id == playlists.editing.id" class="btn btn-primary d-inline-flex text-nowrap me-3" @click="setEditedPlaylist(playlists.loaded.id)">
                            <h5 class="m-auto me-2"><fa-icon :icon="['fas', 'wand-magic']" /></h5>
                            Edit config
                        </button>
                        <Modal v-else button-text="Edit config" :button-icon="['fas', 'wand-magic']" button-class="btn btn-primary me-2">
                            <div class="modal-header">
                                <h1 class="modal-title fs-5" id="exampleModalLabel">Discard current editor?</h1>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                You are currently already editing an automated playlist. If you open this automated playlist configuration, your current changes will be discarded. Are you sure you want to continue?
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="button" class="btn btn-danger" data-bs-dismiss="modal" @click="setEditedPlaylist(playlists.loaded.id)">Yes</button>
                            </div>
                        </Modal>
                    </template>

                    <div v-if="playlists.loaded.filters" class="d-flex align-items-end dropdown">
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
                <div class="accordion rounded-5" :style="`min-height: ${rendered.min_height}px;`">
                    <Track v-if="loading || !playlists.loaded || !playlists.loaded.all_tracks"
                           v-for="index in 20" track="" :id="index" class="playlist-track"/>
                    <template v-else-if="shown.tracks.length > 0"
                              v-for="track, index of shown.tracks.slice(0, rendered.total)">
                                <Track
                                    :track="isVisibleTrack(index) ? track : index"
                                    :id="index" class="playlist-track"
                                    :deleteable="shown.kind !== 'all'"
                                    @delete="removeTrack"/>
                    </template>
                    <h4 v-else class="m-5">
                        No tracks here.
                    </h4>
                </div>
            </div>
        </template>
    </article>
</template>

<script lang="ts">
import { Prop, Vue } from 'vue-property-decorator';
import BreadCrumbs from '~/stores/breadcrumbs';
import Fetch from '~/stores/fetch';
import Playlists, { LoadedPlaylist, partialTrackList } from '~/stores/playlists';
import User from '~/stores/user';
import { CTrack } from '../../backend/src/shared/types/client';
import Layout from '~/stores/layout';
import { WatchStopHandle } from 'nuxt/dist/app/compat/capi';

export default class PlaylistDisplay extends Vue {
    @Prop({ required: true }) id!: string;
    /**Passing this property overrides the default behaviour of loading the playlist based on its ID and the URL
     * and instead will always load the given editingPlaylist */
    @Prop({ default: false }) editingPlaylist!: LoadedPlaylist;

    playlists: Playlists = null as any;
    breadcrumbs: BreadCrumbs = null as any;
    layout: Layout = null as any;

    observer: IntersectionObserver = null as any;
    /** The amount of tracks to load at once */
    batchLoadingSize: number = 25;
    loading: boolean = true;

    /** Contains the watchers function to stop watching */
    watcher: {
        stop: WatchStopHandle;
        delay: NodeJS.Timer;
    } = { stop: () => {}, delay: null as any };

    /**Tracks which should be shown. Only possible if the playlist is an automated playlist */
    shown: {
        kind: "all" | "matched" | "excluded" | "included";
        /** Tracks which are actually rendered.
         * The invisible items are just their ID and will be loaded once scrolled into view to prevent
         * slowing down the DOM */
        tracks: partialTrackList;
        /** List of visible indexes */
        visible: number[];
    } = { kind: 'all', tracks: [], visible: [] };


    rendered: {
        /** Min height of the track list. Is a lower bound estimation of the total required height */
        min_height: number;
        /** Represents the amount of Track Components rendered, as a lot of these slow down the DOM
         *  This number increases by at `rendered.total - rendered.threshold` with `rendered.increase` every time
         */
        total: number;
        /** The threshold before increasing the `rendered.total` again */
        threshold: number;
        /** The amount to increase the `rendered.total` by */
        increase: number;
    } = { min_height: 0, total: 150, threshold: 200, increase: 200 };

    async mounted() {
        if (!process.client) return;

        this.playlists = new Playlists();
        this.playlists.setUser(new User())
        await this.playlists.loadUserPlaylists();
        this.breadcrumbs = new BreadCrumbs();
        this.layout = new Layout();

        /** This observer keeps track of which tracks are visible */
        this.observer = new IntersectionObserver(elements => {this.loadVisibleTracks(elements);}, {
            root: document.getElementById("playlist-wrapper")!,
        });

        /** Style the loading placeholders accordingly */
        await this.layout.render(null, true);

        if (this.id == 'unpublished') {
            await this.showTracks("all");
            this.loading = false;

            // If there is an unpublished playlist, load it
            if (this.playlists.unpublished)
                this.playlists.loadUserPlaylistByID(this.playlists.unpublished.id);

            await this.layout.render(null, true);
            return;
        }

        /**We must load tracks as CTracks, these cannot be string[] */
        // Load the library if we're on the library page
        else if (this.$route.path == '/library' || this.id == 'library') {
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
            const playlist = (await Fetch.get<any>(`spotify:/playlists/${this.id}?limit=50`)).data;
            playlist.image = Fetch.bestImage(playlist.images);
            playlist.ownership = this.playlists.playlistOwnership(playlist);

            const tracks = Fetch.format(playlist.tracks).map((track: any) => this.playlists.convertToCTrack(track))
            playlist.all_tracks = Array(playlist.tracks.total).fill("");
            playlist.all_tracks.splice(0, 50, tracks);
            this.playlists.loaded = playlist;
        }

        await this.showTracks("all");
        this.breadcrumbs.add(useRoute().fullPath, this.playlists.loaded.name)
        this.loading = false;
        await this.layout.render(null, true);

        // Store the unwatch handlers
        this.watcher = {
            stop: watch(() => [
                this.playlists.loaded.all_tracks,
                this.playlists.loaded.matched_tracks,
                this.playlists.loaded.excluded_tracks,
                this.playlists.loaded.included_tracks
            ], () => {
                clearTimeout(this.watcher.delay);
                this.watcher.delay = setTimeout(() => this.showTracks(this.shown.kind), 500);
            }),
            delay: null as any
        }
    }

    beforeUnmount() {
        this.watcher.stop();
    }

    /**
     * Shows either all tracks, matched tracks, excluded tracks or included tracks
     * @param kind What kind of tracks to show
     */
    async showTracks(kind: "all" | "matched" | "excluded" | "included") {
        // Make sure we have a playlist and that we can select the requested tracks
        if (!this.playlists.loaded || (!this.playlists.loaded.filters && (kind == 'excluded' || kind == 'included')))
            return false;

        this.loading = true;

        // Remove all elements from the observer
        for (const item of document.getElementsByClassName("playlist-track")) {
            this.observer.unobserve(item);
        }

        this.shown.kind = kind;
        await this.$nextTick();

        // Get the tracks we want to show
        let tracks = await this.playlists.loadPlaylistTracks(kind, 0);
        switch(kind) {
            case "all":
                this.shown.tracks = this.playlists.loaded.all_tracks = tracks.all;
                break;
            case "matched":
                this.shown.tracks = this.playlists.loaded.matched_tracks = tracks.matched;

                break;
            case "excluded":
                this.shown.tracks = this.playlists.loaded.excluded_tracks = tracks.excluded;
                break;
            case "included":
                this.shown.tracks = this.playlists.loaded.included_tracks = tracks.included;
                break;
        }

        this.rendered.min_height = (document.getElementsByClassName("playlist-track")[0].clientHeight || 50)
                                    * this.shown.tracks.length;
        this.loading = false;

        this.$nextTick(() => {
            // Observe all items
            for (const item of document.getElementsByClassName("playlist-track")) {
                this.observer.observe(item);
            }
        })

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

    /**
     * Removes all tracks from the shown list
     */
    clearShownTracks() {
        switch (this.shown.kind) {
            case "all": break;
            case "matched":
                this.playlists.removeMatched(this.playlists.loaded.matched_tracks);
                break;
            case "excluded":
                this.playlists.removeExcluded(this.playlists.loaded.excluded_tracks)
                break;
            case "included":
                this.playlists.removeIncluded(this.playlists.loaded.included_tracks)
                break;
        }

        this.showTracks(this.shown.kind)
    }

    /**
     * Removes one track from the shown list
     * @param track Track to remove from the shown list
     */
    removeTrack(track: CTrack) {
        switch (this.shown.kind) {
            case "all": break;
            case "matched":
                this.playlists.removeMatched([track])
                break;
            case "excluded":
                this.playlists.removeExcluded([track])
                break;
            case "included":
                this.playlists.removeIncluded([track])
                break;
        }

        this.showTracks(this.shown.kind)
    }

    /**
     * Opens the playlist editor for the given playlist
     * @param id ID of the playlist to edit
     */
    async setEditedPlaylist(id: string) {
        this.playlists.editing = null;
        await this.$nextTick();
        await this.playlists.loadEditingPlaylist(id);
        await this.showTracks("all");
        // Click the edit button to try and open the offcanvas edit view
        await this.$nextTick();
        document.getElementById("toolbar")?.lastChild?.lastChild?.lastChild?.click();
        this.layout.render(null, true)
    }

    loadVisibleTracks(elements: IntersectionObserverEntry[]) {
        // If for some reason there are no elements, stop
        if (elements.length == 0) return;

        // If there are as much elements as there are tracks, load only those who are intersecting
        if (elements.length == this.shown.tracks.length) {
            // Get the indexes of the visible elements
            this.shown.visible = elements.filter(e => e.isIntersecting).map(e => parseInt(e.target.id));
        }

        // For each element, if intersecting, add, else remove
        else {
            for (const element of elements) {
                const index = parseInt(element.target.id);
                if (element.isIntersecting && !this.shown.visible.includes(index))
                    this.shown.visible.push(index);
                else if (!element.isIntersecting && this.shown.visible.includes(index))
                    this.shown.visible.splice(this.shown.visible.indexOf(index), 1);
            }
        }

        // We load tracks in batches of batchLoadingSize. Calculate if the next and previous 5 tracks are loaded
        const prev = Math.max(Math.min(...this.shown.visible) - 10, 0);
        const next = Math.min(Math.max(...this.shown.visible) + 10, this.shown.tracks.length - 1);

        // If the next track is `rendered.total - rendered.threshold` away from the end, increase the amount of rendered tracks
        if (next > this.rendered.total - this.rendered.threshold) {
            this.rendered.total += this.rendered.increase;

            // The InteractionObserver needs to know of the new elements. Call this function to do that
            this.showTracks(this.shown.kind);
        }

        let offset;
        // If the previous tracks are not loaded, load them
        if (typeof this.shown.tracks[prev] === 'string') {
            offset = Math.floor(prev / this.batchLoadingSize) * this.batchLoadingSize;
            this.playlists.loadPlaylistTracks(this.shown.kind, offset);
        }

        // If the next tracks are not loaded, load them
        if (typeof this.shown.tracks[next] === 'string') {
            offset = Math.floor(next / this.batchLoadingSize) * this.batchLoadingSize;
            this.playlists.loadPlaylistTracks(this.shown.kind, offset);
        }
    }

    isVisibleTrack(index: number, margin: number = 8) {
        return this.shown.visible.includes(index) ||
                 (index > Math.min(...this.shown.visible) - margin &&
                  index < Math.max(...this.shown.visible) + margin);
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

<style lang="scss">
.modal-delete {
    color: rgb(155, 0, 0) !important;
    font-size: 120% !important;
    background: transparent !important;
}
</style>