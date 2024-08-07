<template>
    <article class="rounded-2 p-2 bg-dark-subtle flex-grow-1 overflow-hidden">
        <template v-if="playlists">
            <SmallHeader :item="playlists.loaded"></SmallHeader>
            <div id="playlist-wrapper" class="h-100 overflow-y-auto overflow-hidden" data-edit-class="full-d-none">
                <Title v-if="!playlists.loaded">Loading playlist</Title>
                <Title v-else>{{ playlists.loaded.name }}</Title>
                <header class="p-4 pt-5 d-flex gap-4 mb-3" data-main-class="normal-flex-row normal-align-items-stretch tiny-flex-column tiny-align-items-center">
                    <Image :src="playlists.loaded" class="m-auto"/>
                    <div class="flex-fill d-flex flex-column text-white placeholder-glow">
                        <template v-if="!playlists.loaded">
                            <span class="m-auto placeholder rounded-2" style="width: 15rem; height:2rem"></span>
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
                                <template v-if="loading || editor.executing || !playlists.loaded || !playlists.loaded.all_tracks">
                                    <span class="d-inline-block loading-icon"></span>loading tracks
                                </template>
                                <span v-else>{{ playlists.loaded.all_tracks.length }}
                                    track{{ playlists.loaded.all_tracks.length == 1 ? '' : 's'}}
                                </span>
                            </div>
                            <span v-if="playlists.loaded.id != 'unpublished' && playlists.loaded.id != 'library'">ID: {{ playlists.loaded.id }}</span>
                            <span v-if="playlists.loaded.filters">Automated playlist</span>
                            <Spotify v-if="playlists.loaded.id === 'library'" :to="`https://open.spotify.com/collection/tracks`" class="mt-3 mb-3">SHOW IN SPOTIFY</Spotify>
                            <Spotify v-else-if="playlists.loaded.id !== playlists.unpublished?.id" :to="`https://open.spotify.com/playlist/${playlists.loaded.id}`" class="mt-3 mb-3">SHOW IN SPOTIFY</Spotify>
                        </template>
                    </div>
                </header>
                <div v-if="playlists && playlists.loaded" id="playlist-toolbar" :class="`d-flex sticky-top shadow-lg flex-wrap gap-2 rounded-3 bg-body-tertiary ps-3 pe-3 pt-2 pb-2 mb-3${playlistToolbarSticky?' border-bottom':''}`" data-main-class="normal-normal tiny-tiny">
                    <template v-if="!playlistToolbarSticky">
                        <button v-if="playlists.loaded.ownership == 'following'" class="d-flex border-0 bg-transparent p-2 ps-3 p-1 me-auto" @click="unfollow">
                            <fa-icon style="font-size: 150%;" :icon="['fas', 'heart']"></fa-icon>
                        </button>
                        <button v-else-if="playlists.loaded.ownership == 'none'" class="d-flex border-0 bg-transparent p-2 ps-3 p-1 me-auto" @click="follow">
                            <fa-icon style="font-size: 150%;" :icon="['far', 'heart']"></fa-icon>
                        </button>
                        <Modal v-else-if="playlists.loaded.ownership == 'user' && playlists.loaded.id !== 'library'"
                               :button-icon="['fas', 'trash-can']"
                               button-class="modal-delete ps-3 p-1 me-auto"
                               @open="startDeleteTimeout">
                            <div class="modal-header">
                                <h1 class="modal-title fs-5" id="exampleModalLabel">Delete</h1>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div v-if="playlists.loaded.filters" class="modal-body">
                                You can either convert this automated playlist to a normal playlist or delete it entirely.
                                <ol class="list-group list-group-numbered my-3">
                                    <li class="list-group-item d-flex justify-content-between align-items-start">
                                        <div class="ms-2 me-auto">
                                            <div class="fw-bold text-info">
                                                Convert to a normal playlist
                                            </div>
                                            This will keep your playlist in Spotify, but it will not automatically update anymore
                                        </div>
                                    </li>
                                    <li class="list-group-item d-flex justify-content-between align-items-start">
                                        <div class="ms-2 me-auto">
                                            <div class="fw-bold text-danger">
                                                Delete the playlist
                                            </div>
                                            will remove the automated playlist here and it in spotify. People following the playlist will still have it and it will not be updated anymore
                                        </div>
                                    </li>
                                </ol>
                            </div>
                            <div v-else class="modal-body">
                                This will remove the playlist from Spotify. People following the playlist will still have it.
                            </div>
                            <div class="modal-footer">
                                <button class="btn btn-secondary me-auto" data-bs-dismiss="modal">Cancel</button>
                                <span v-if="deleteTimer > 0" class="me-2">
                                    ({{ deleteTimer }})
                                </span>
                                <button class="btn btn-danger"
                                        data-bs-dismiss="modal"
                                        :disabled="deleteTimer > 0"
                                        @click="remove">Delete</button>
                                <button v-if="playlists.loaded.filters"
                                        class="btn btn-info"
                                        data-bs-dismiss="modal"
                                        :disabled="deleteTimer > 0"
                                        @click="convert">Convert</button>
                            </div>
                        </Modal>
                    </template>
                    <div v-else class="d-flex me-auto">
                        <Image class="ms-2 me-3" style="width: 2.5rem; height: 2.5rem;" :src="playlists.loaded"/>
                        <h4 class="m-auto">{{ playlists.loaded.name }}</h4>
                    </div>

                    <Modal v-if="(shown.kind == 'excluded' || shown.kind == 'included') && shown.tracks.length > 0" :button-text="`Clear ${shown.kind} tracks`" button-class="btn btn-secondary text-nowrap me-3">
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

                    <template v-if="editor && playlists.loaded.filters !== undefined && playlists.loaded.ownership == 'user'">
                        <button v-if="!editor.shown"
                                class="btn btn-primary d-inline-flex text-nowrap me-3" @click="loadEditor">
                            <h5 class="m-auto me-2"><fa-icon :icon="['fas', 'wand-magic']" /></h5>
                            Edit config
                        </button>
                        <button v-else-if="playlists.loaded?.id === editor.id"
                                class="btn btn-primary d-inline-flex text-nowrap me-3" disabled>
                            <h5 class="m-auto me-2"><fa-icon :icon="['fas', 'wand-magic']" /></h5>
                            Config open
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
                                <button type="button" class="btn btn-danger" data-bs-dismiss="modal" @click="loadEditor">Yes</button>
                            </div>
                        </Modal>
                    </template>

                    <div v-if="playlists.loaded.filters" class="d-flex align-items-end dropdown">
                        <button class="btn" type="button" data-bs-toggle="dropdown">
                            <h5 class="m-0"><fa-icon :icon="['fas', 'arrow-down-wide-short']" /></h5>
                        </button>
                        <ul ref="shownTracksSelect" class="dropdown-menu">
                            <li><url :class="`dropdown-item ${shown.kind == 'all' ? 'active' : '' }`"
                                     @click="showTracks('all')">
                                All tracks ({{ playlists.loaded.all_tracks?.length }})
                            </url></li>
                            <li><url :class="`dropdown-item ${shown.kind == 'matched' ? 'active' : '' }`"
                                     @click="showTracks('matched')">
                                Matched tracks ({{ playlists.loaded.matched_tracks?.length }})
                            </url></li>
                            <li><url :class="`dropdown-item ${shown.kind == 'excluded' ? 'active' : '' }`"
                                     @click="showTracks('excluded')">
                                Manually excluded tracks ({{ playlists.loaded.excluded_tracks?.length }})
                            </url></li>
                            <li><url :class="`dropdown-item ${shown.kind == 'included' ? 'active' : '' }`"
                                     @click="showTracks('included')">
                                Manually included tracks ({{ playlists.loaded.included_tracks?.length }})
                            </url></li>
                        </ul>
                    </div>

                    <div v-if="playlists.loaded.id == 'library'" class="d-flex align-items-end dropdown ms-auto">
                        <button class="btn" type="button" data-bs-toggle="dropdown">
                            <h5 class="m-0"><fa-icon :icon="['fas', 'arrow-down-wide-short']" /></h5>
                        </button>
                        <ul class="dropdown-menu">
                            <li><url :class="`dropdown-item ${shown.kind == 'all' ? 'active' : '' }`"
                                     @click="showLibraryTracks('all')">
                                All tracks ({{ playlists.library.all_tracks?.length }})
                            </url></li>
                            <li><url :class="`dropdown-item ${shown.kind == 'unused' ? 'active' : '' }`"
                                     @click="showLibraryTracks('unused')">
                                Tracks not in any playlist ({{ playlists.library.unused_tracks?.length || '...'}})
                            </url></li>
                            <li><url :class="`dropdown-item ${shown.kind == 'unused-auto' ? 'active' : '' }`"
                                     @click="showLibraryTracks('unused-auto')">
                                Tracks not in any automated playlist ({{ playlists.library.unused_auto_tracks?.length || '...' }})
                            </url></li>
                        </ul>
                    </div>
                </div>
                <div v-if="layout" class="accordion rounded-5" :style="`min-height: ${rendered.min_height}px;`">
                    <Track v-if="loading || editor.executing || !playlists.loaded || !playlists.loaded.all_tracks"
                           v-for="index in 20"
                           track=""
                           :id="index"
                           :class="`playlist-track${layout.main.state == 'tiny' ? ' tiny' : ''}`"/>
                    <template v-else-if="shown.tracks.length > 0"
                              v-for="track, index of shown.tracks.slice(0, rendered.total)">
                        <Track
                            :track="isVisibleTrack(index) ? track : index"
                            :id="index" :class="`playlist-track${layout.main.state == 'tiny' ? ' tiny' : ''}`"
                            :deleteable="shown.kind !== 'all' && !(typeof track === 'string' || track.id)"
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
import Playlists, { LoadedPlaylist, PartialTrackList, TrackKind } from '~/stores/playlists';
import User from '~/stores/user';
import { CPlaylist, CTrack } from '../../backend/src/shared/types/client';
import Layout from '~/stores/layout';
import Editor from '~/stores/editor';

export default class PlaylistDisplay extends Vue {
    playlists: Playlists = null as any;
    editor: Editor = null as any;
    breadcrumbs: BreadCrumbs = null as any;
    layout: Layout = null as any;

    observer: IntersectionObserver = null as any;
    /** The amount of tracks to load at once */
    batchLoadingSize: number = 50;
    loading: boolean = true;
    /** When the buttons for deletion in the modal are clickable */
    deleteTimer: number = 0;

    /** Whether the playlist toolbar is behaving sticky */
    playlistToolbarSticky: boolean = false;

    /**Tracks which should be shown. Only possible if the playlist is an automated playlist */
    shown: {
        kind: TrackKind;
        /** Tracks which are actually rendered.
         * The invisible items are just their ID and will be loaded once scrolled into view to prevent
         * slowing down the DOM */
        tracks: PartialTrackList;
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
    } = { min_height: 0, total: 100, threshold: 100, increase: 100 };

    async mounted() {
        if (!process.client) return;

        // Get the ID of the playlist from the URL
        const id = this.$route.params.id as string;

        this.playlists = new Playlists();
        this.playlists.setUser(new User())
        await this.playlists.loadUserPlaylists();
        this.breadcrumbs = new BreadCrumbs();
        this.layout = new Layout();
        this.editor = new Editor();

        /** This observer keeps track of which tracks are visible */
        this.observer = new IntersectionObserver(elements => {this.loadVisibleTracks(elements);}, {
            root: document.getElementById("playlist-wrapper")!,
        });

        /** Style the loading placeholders accordingly */
        await this.layout.render(null, true);

        if (id == 'unpublished') {
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
        else if (this.$route.path == '/library' || id == 'library') {
            await this.playlists.loadUserLibrary();
        }

        // Load the user playlist if we're supposed to show that
        else if (this.$route.path.startsWith('/playlist')) {
            if (!(await this.playlists.loadUserPlaylistByID(id))){
                return this.$router.push(`/info/playlist/${id}`);
            }
        }

        // Load a random playlist the user stumbled upon
        else {
            const response = (await Fetch.get<any>(`spotify:/playlists/${id}`, {
                query: {
                    fields: 'id,name,description,images,owner,tracks.total'
                }
            })).data;

            // Create the basic playlist object. We need to load the tracks separately
            const playlist = {
                id: response.id,
                name: response.name,
                description: response.description,
                image: Fetch.bestImage(response.images),
                owner: response.owner,
                ownership: this.playlists.playlistOwnership(response),
                all_tracks: Array(response.tracks.total).fill(""),
            }
            this.playlists.loaded = playlist as LoadedPlaylist;
        }

        await this.showTracks("all");
        this.breadcrumbs.add(useRoute().fullPath, this.playlists.loaded.name)
        this.loading = false;
        await this.layout.render(null, true);
        this.detectSticyPlaylistToolbar();

        // If the playlist tracks are updated, reload the list
        watch(() => this.editor.executing, () => {
            if (!this.editor.executing) this.showTracks(this.shown.kind);
        })
    }

    /**
     * Shows either all tracks, matched tracks, excluded tracks or included tracks
     * @param kind What kind of tracks to show
     */
    async showTracks(kind: TrackKind) {
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
                this.shown.tracks = tracks.all;
                break;
            case "matched":
                this.shown.tracks = tracks.matched;
                break;
            case "excluded":
                this.shown.tracks = tracks.excluded;
                break;
            case "included":
                this.shown.tracks = tracks.included;
                break;
            case "unused":
                this.shown.tracks = tracks.unused;
                break;
            case "unused-auto":
                this.shown.tracks = tracks.unused_auto;
                break;
        }

        this.rendered.min_height = document.getElementsByClassName("playlist-track")[0].clientHeight
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

        return true;
    }

    /**
     * Shows certain tracks in the library
     * @param kind What kind of tracks to show
     */
    async showLibraryTracks(kind: "all" | "unused" | "unused-auto") {
        let playlists: CPlaylist[];
        switch (kind) {
            case "all":
                return this.showTracks("all");
            case "unused":
                playlists = this.playlists.storage
                break;
            case "unused-auto":
                playlists = this.playlists.storage.filter(p => p.filters)
                break;
        }

        // Load all tracks from the library
        let ids = this.playlists.loaded.all_tracks.map(t => (t as CTrack).id ?? t as string);

        // Filter out the tracks which are not in the selected playlists
        await this.playlists.loadPlaylists_all_tracks();
        let allTrackIds = playlists.flatMap(p => p.all_tracks);
            allTrackIds = allTrackIds.filter((id, index) => allTrackIds.indexOf(id) == index);

        // Calculate the tracks which are not in the selected playlists
        const danglingTracks: any[] = ids.filter(id => !allTrackIds.includes(id));

        // Ensure we load the first 20 tracks
        let retrievedTracks = (await Fetch.get<CTrack[]>('spotify:/tracks', {
            ids: danglingTracks.slice(0, 20)
        })).data;
        retrievedTracks = retrievedTracks.map(t => this.playlists.convertToCTrack(t));

        // Replace the ids with the actual tracks
        for (const track of [...retrievedTracks]) {
            danglingTracks[danglingTracks.indexOf(track.id)] = track;
        }

        switch (kind) {
            case "unused":
                this.playlists.library.unused_tracks = danglingTracks;
                break;
            case "unused-auto":
                this.playlists.library.unused_auto_tracks = danglingTracks;
                break;
        }

        this.showTracks(kind);
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

        this.$nextTick(() => this.showTracks(this.shown.kind))
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

        this.$nextTick(() => this.showTracks(this.shown.kind))
    }

    /**
     * Detects if the playlist toolbar is sticky and sets the `playlistToolbarSticky` property accordingly
     */
    detectSticyPlaylistToolbar() {
        let playlistToolbarPreviousLocation = 0;
        document.getElementById("playlist-wrapper")!.onscroll = () => {
            let currentPos = document.getElementById("playlist-toolbar")!.getBoundingClientRect().top;
            this.playlistToolbarSticky = currentPos == playlistToolbarPreviousLocation
            playlistToolbarPreviousLocation = currentPos;
        }
    }

    /**
     * Opens the playlist editor for the given playlist
     * @param id ID of the playlist to edit
     */
    async loadEditor() {
        await this.$nextTick();
        // Load the config of the playlist
        if (new Editor().loadConfig(this.playlists.loaded)) {
            // Click the edit button to try and open the offcanvas edit view
            await this.$nextTick();
            document.getElementById("mobile-open-edit")?.click();
            this.layout.open('edit');
            this.layout.render(null, true);
        }
    }

    /** Stores requests waiting to be completed by `loadPlaylistTracks` to prevent duplicate requests */
    loadingQueue: {[key: string]: boolean } = {};
    /**
     * Loads the tracks which are intersecting with the viewport
     * @param elements List of elements which are intersecting
     */
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
                else if (!element.isIntersecting && this.shown.visible.includes(index)) {
                    this.shown.visible.splice(this.shown.visible.indexOf(index), 1);
                }
            }
        }

        // We load tracks in batches of batchLoadingSize. Calculate if the next and previous 5 tracks are loaded
        const prev = Math.max(Math.min(...this.shown.visible) - 10, 0);
        const next = Math.min(Math.max(...this.shown.visible) + 10, this.shown.tracks.length - 1);

        /* If next is -Infinity, the position of the scrollbar is outside that of the rendered tracks threshold.
         * Increase the threshold and retry */
        if (next == -Infinity && this.rendered.total < this.shown.tracks.length) {
            this.rendered.total += this.rendered.increase;
            return this.showTracks(this.shown.kind);
        }

        // If the next track is `rendered.total - rendered.threshold` away from the end, increase the amount of rendered tracks
        if (next > this.rendered.total - this.rendered.threshold) {
            this.rendered.total += this.rendered.increase;

            // The InteractionObserver needs to know of the new elements. Call this function to do that
            this.showTracks(this.shown.kind);
        }

        // If the previous or next tracks are not loaded, load them
        for (const location of [prev, next]) {
            if (typeof this.shown.tracks[location] === 'string') {
                const offset = Math.floor(location / this.batchLoadingSize) * this.batchLoadingSize;
                // If the tracks are not already loading, load them
                if (!(`${this.shown.kind}-${offset}` in this.loadingQueue)) {
                    this.loadingQueue[`${this.shown.kind}-${offset}`] = true;
                    // Load the tracks and remove the from the loading queue on finish
                    this.playlists.loadPlaylistTracks(this.shown.kind, offset).then(() => {
                        delete this.loadingQueue[`${this.shown.kind}-${offset}`];
                    });
                }
            }
        }
    }

    isVisibleTrack(index: number, margin: number = 8) {
        return this.shown.visible.includes(index) ||
                 (index > Math.min(...this.shown.visible) - margin &&
                  index < Math.max(...this.shown.visible) + margin);
    }

    convert() {
        this.playlists.delete(this.playlists.loaded, true)

        if (this.editor.id == this.playlists.loaded.id)
            this.editor.close();
    }

    remove() {
        this.playlists.delete(this.playlists.loaded, false)

        if (this.editor.id == this.playlists.loaded.id)
            this.editor.close();

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

    startDeleteTimeout() {
        this.deleteTimer = 3;
        const interval = setInterval(() => {
            this.deleteTimer--;
            if (this.deleteTimer == 0) clearInterval(interval);
        }, 1000);
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