<template>
    <article id="playlist-wrapper" class="h-100 overflow-y-auto overflow-hidden">
        <Title v-if="!playlists.loaded">Loading playlist</Title>
        <Title v-else>{{ playlists.loaded.name }}</Title>
        <header class="small-header d-flex p-4 pt-5 gap-4 mb-3">
            <Image id="header-artwork" class="ms-sm-4" :src="playlists.loaded?.image"/>
            <div class="flex-fill d-flex flex-column text-white placeholder-glow my-auto">
                <template v-if="!playlists.loaded">
                    <h1 class="placeholder rounded-2" style="width: 15rem; height:2rem"></h1>
                    <span class="placeholder rounded-2" style="width: 10rem"></span>
                    <div class="mt-5 mb-1">
                        <span class="placeholder rounded-2" style="width: 5rem"></span>
                        &nbsp;&nbsp;━&nbsp;&nbsp;
                        <div class="spinner-border spinner-border-sm me-2" role="status"></div>loading tracks
                    </div>
                    <div>
                        ID: <span class="placeholder rounded-2" style="width: 15rem"></span>
                    </div>
                </template>
                <template v-else>
                    <h1 class="mt-auto">{{ playlists.loaded.name }}</h1>
                    <span>{{ playlists.loaded.description }}</span>
                    <div class="mt-3 d-flex align-items-center flex-wrap gap-2">
                        <url :to="`/info/user/${playlists.loaded.owner.id}`" class="rounded-2">
                            {{ playlists.loaded.owner.display_name }}
                        </url>
                        &nbsp;&nbsp;━&nbsp;&nbsp;
                        <template v-if="(tracks.loading && !playlists?.loaded?.all_tracks) || (editor.executing && playlists.loaded.id == editor.id)">
                            <div class="spinner-border spinner-border-sm me-2" role="status"></div>loading tracks
                        </template>
                        <span v-else>{{ playlists.loaded.all_tracks.length }}
                            track{{ playlists.loaded.all_tracks.length == 1 ? '' : 's'}}
                        </span>
                    </div>
                    <span v-if="playlists.loaded.id != 'unpublished' && playlists.loaded.id != 'library'">
                        ID: {{ playlists.loaded.id }}
                    </span>
                    <div v-if="playlists.loaded.filters" class="d-flex">
                        <span class="rounded-1 bg-light-subtle mt-2" style="padding: 0.1rem 0.3rem">Automated playlist</span>
                    </div>
                    <SpotifyLink v-if="playlists.loaded.id === 'library'" :to="`https://open.spotify.com/collection/tracks`" class="mt-3 mb-3">SHOW IN SPOTIFY</SpotifyLink>
                    <SpotifyLink v-else-if="playlists.loaded.id !== playlists.unpublished?.id" :to="`https://open.spotify.com/playlist/${playlists.loaded.id}`" class="mt-3 mb-3">SHOW IN SPOTIFY</SpotifyLink>
                </template>
            </div>
        </header>
        <section id="playlist-toolbar" :class="`d-flex sticky-top shadow-lg flex-wrap gap-2 rounded-3 bg-body-tertiary px-3 py-2 mb-3${playlistToolbarSticky?' border-bottom':''}`" style="top: -1px">
            <template v-if="playlists.loaded">
                <template v-if="!playlistToolbarSticky">
                    <button v-if="playlists.loaded.ownership == 'following'" class="d-flex border-0 bg-transparent p-2 ps-3 p-1 me-auto" @click="unfollow">
                        <fa-icon style="font-size: 150%;" :icon="['fas', 'heart']"></fa-icon>
                    </button>
                    <button v-else-if="playlists.loaded.ownership == 'none'" class="d-flex border-0 bg-transparent p-2 ps-3 p-1 me-auto" @click="follow">
                        <fa-icon style="font-size: 150%;" :icon="['far', 'heart']"></fa-icon>
                    </button>
                    <Modal v-else-if="playlists.loaded.ownership == 'user' && playlists.loaded.id !== 'library'"
                            :button-icon="['fas', 'trash-can']"
                            button-class="btn modal-delete text-danger ps-3 p-1 me-auto"
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

                            <button class="btn btn-danger"
                                    data-bs-dismiss="modal"
                                    :disabled="deleteTimer > 0"
                                    @click="remove">
                                Delete
                                <span v-if="deleteTimer > 0">
                                    ({{ deleteTimer }})
                                </span>
                            </button>
                            <button v-if="playlists.loaded.filters"
                                    class="btn btn-info"
                                    data-bs-dismiss="modal"
                                    :disabled="deleteTimer > 0"
                                    @click="convertToNormal">Convert</button>
                        </div>
                    </Modal>
                </template>
                <div v-else class="d-flex me-auto">
                    <Image class="ms-2 me-3" style="width: 2.5rem; height: 2.5rem;" :src="playlists.loaded.image"/>
                    <h4 class="m-auto">{{ playlists.loaded.name }}</h4>
                </div>

                <div class="d-flex">
                    <div class="input-group">
                        <button :class="`btn btn-outline-dark text-white border-0 ${search.shown ? 'bg-dark':''}`" @click="searchShow">
                            <h5 class="m-0"><fa-icon :icon="['fas', 'search']" /></h5>
                        </button>
                        <Transition name="search">
                            <input v-if="search.shown"
                                   ref="search-input"
                                   @input="searchQuery(($event.target as HTMLInputElement)!.value)"
                                   @focusout="searchTryClose"
                                   class="form-control border-0" style="max-width: 12rem" autocomplete="off">
                        </Transition>
                    </div>
                </div>

                <template v-if="editor && playlists.loaded.filters !== undefined && playlists.loaded.ownership == 'user'">
                    <button v-if="layout.editor.state === 'none'"
                            class="btn btn-primary d-inline-flex text-nowrap" @click="loadEditor">
                        <h5 class="m-auto"><fa-icon :icon="['fas', 'wand-magic']" /></h5>
                        <span class="small-hide ms-3">
                            Edit config
                        </span>
                    </button>
                    <button v-else-if="playlists.loaded?.id === editor.id"
                            class="btn btn-primary d-inline-flex text-nowrap" disabled>
                        <h5 class="m-auto"><fa-icon :icon="['fas', 'wand-magic']" /></h5>
                        <span class="small-hide ms-3">
                            Config open
                        </span>
                    </button>
                    <Modal v-else :button-text="'Edit config'" :button-icon="['fas', 'wand-magic']" button-class="small-hide btn btn-primary">
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

                <Modal v-if="(tracks.kind == 'excluded' || tracks.kind == 'included') && tracks.items.length > 0" :button-icon="['fas', 'eraser']" button-class="btn btn-secondary text-nowrap fs-5">
                    <div class="modal-header">
                        <h1 class="modal-title fs-5" id="exampleModalLabel">Clear all {{ tracks.kind }} tracks?</h1>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        This operation will clear the {{ tracks.kind }} list and {{ tracks.kind == 'excluded' ? 'include' : 'exclude' }} all {{ tracks.items.length }} tracks again.
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" data-bs-dismiss="modal" @click="removeTracks()">Yes</button>
                    </div>
                </Modal>

                <div v-if="playlists.loaded.filters" class="d-flex align-items-end dropdown">
                    <button class="btn" type="button" data-bs-toggle="dropdown">
                        <h5 class="m-0"><fa-icon :icon="['fas', 'arrow-down-wide-short']" /></h5>
                    </button>
                    <ul ref="shownTracksSelect" class="dropdown-menu">
                        <li><url :class="`dropdown-item ${tracks.kind == 'all' ? 'active' : '' }`"
                                    @click="showTracks('all')">
                            All tracks ({{ playlists.loaded.all_tracks?.length }})
                        </url></li>
                        <li><url :class="`dropdown-item ${tracks.kind == 'matched' ? 'active' : '' }`"
                                    @click="showTracks('matched')">
                            Matched tracks ({{ playlists.loaded.matched_tracks?.length }})
                        </url></li>
                        <li><url :class="`dropdown-item ${tracks.kind == 'excluded' ? 'active' : '' }`"
                                    @click="showTracks('excluded')">
                            Manually excluded tracks ({{ playlists.loaded.excluded_tracks?.length }})
                        </url></li>
                        <li><url :class="`dropdown-item ${tracks.kind == 'included' ? 'active' : '' }`"
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
                        <li><url :class="`dropdown-item ${tracks.kind == 'all' ? 'active' : '' }`"
                                    @click="showLibraryTracks('all')">
                            All tracks ({{ playlists.library.all_tracks?.length }})
                        </url></li>
                        <li><url :class="`dropdown-item ${tracks.kind == 'unused' ? 'active' : '' }`"
                                    @click="showLibraryTracks('unused')">
                            Tracks not in any playlist ({{ playlists.library.unused_tracks?.length || '...'}})
                        </url></li>
                        <li><url :class="`dropdown-item ${tracks.kind == 'unused-auto' ? 'active' : '' }`"
                                    @click="showLibraryTracks('unused-auto')">
                            Tracks not in any automated playlist ({{ playlists.library.unused_auto_tracks?.length || '...' }})
                        </url></li>
                    </ul>
                </div>
            </template>
        </section>
        <section class="accordion rounded-5" :style="`min-height: ${rendered.min_height}px`">
            <Track v-if="tracks.loading || !playlists.loaded?.all_tracks || (editor.executing && playlists.loaded.id == editor.id)"
                   v-for="index in 20"
                   track=""
                   :id="index"/>
            <template v-else-if="tracks.items.length > 0"
                      v-for="track, index of tracks.items.slice(0, rendered.total)">
                <Track :track="isVisibleTrack(index) ? track : `${index}`"
                       :id="index"
                       :deleteable="tracks.kind == 'matched' || tracks.kind == 'excluded' || tracks.kind == 'included'"
                       @delete="removeTracks([track])"/>
            </template>
            <h4 v-else-if="!search.shown" class="m-5">No tracks in this playlist yet!</h4>
            <h4 v-else class="m-5">No tracks matched the search</h4>
        </section>
        <div class="d-flex mt-4 mb-3">
            <span class="rounded-1 bg-light-subtle fs-5 mx-auto px-2" style="padding: 0.1rem 0.3rem">Showing {{ tracks.items.length }} track{{ tracks.items.length == 1 ? '' : 's' }}</span>
        </div>
    </article>
</template>

<script lang="ts">
import { Vue, Component, toNative } from 'vue-facing-decorator';
import type { CTrack } from '../../backend/src/shared/types/client';
import Playlists, { type LoadedPlaylist, type PartialTrackList, type TrackKind } from '~/stores/playlists';
import Editor from '~/stores/editor';
import Fetch from '~/composables/fetch';
import Layout from '~/stores/layout';


@Component({})
class Playlist extends Vue {
    playlists: Playlists = null as any;
    editor: Editor = null as any;
    layout: Layout = null as any;

    playlistToolbarSticky = false;

    /**Tracks which should be shown. Only possible if the playlist is an automated playlist */
    tracks: {
        kind: TrackKind;
        /** Tracks which are actually rendered.
         * The invisible items are just their ID and will be loaded once scrolled into view to prevent
         * slowing down the DOM */
        items: PartialTrackList;
        /** List of visible indexes */
        visible: number[];
        /** Whether the tracks are (re)loading */
        loading: boolean;
        /** The observer instance */
        observer: IntersectionObserver;
    } = { kind: 'all', items: [], visible: [], loading: false, observer: null as any };

    rendered: {
        /** Min height of the track list. Is a lower bound estimation of the total required height */
        min_height: number;
        /** Represents the amount of Track Components rendered, as a lot of these slow down the DOM
         *  This number increases by at `rendered.total - rendered.threshold` with `rendered.increase` every time */
        total: number;
        /** The threshold before increasing the `rendered.total` again */
        threshold: number;
        /** The amount to increase the `rendered.total` by */
        increase: number;
    } = { min_height: 0, total: 100, threshold: 100, increase: 100 };

    /** The search query */
    search = {
        query: null as string | null,
        shown: false,
    }

    created() {
        this.playlists = new Playlists();
        this.editor = new Editor();
        this.layout = new Layout();
    }

    async mounted() {
        const id = this.$route.params.id as string;

        // Load the library if we're on the library page
        if (this.$route.path == '/library' || id == 'library') {
            await this.playlists.loadUserLibrary();
        }

        // Load the user playlist if we're supposed to show that
        else if (this.$route.path.startsWith('/playlist')) {
            if (!(await this.playlists.loadUserPlaylistByID(id))){
                // If unpublished, go to main page. Otherwise find the item
                return navigateTo(id == 'unpublished' ? '/' :`/info/playlist/${id}`);
            }
        }

        // Load a random playlist the user stumbled upon
        else {
            const response = (await Fetch.get<any>(`spotify:/playlists/${id}`, {
                query: {
                    fields: 'id,name,description,images,owner,tracks.total'
                }
            })).data;

            if (response.error) {
                return navigateTo('/');
            }

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

        /** Start watching */
        this.registerTriggers();
        await this.showTracks('all');

    }

    /**
     * Opens the playlist editor for the given playlist
     * @param id ID of the playlist to edit
     */
    async loadEditor() {
        // Load the config of the playlist
        if (new Editor().loadConfig(this.playlists.loaded)) {
            // Click the edit button to try and open the offcanvas edit view
            document.getElementById("open-editor")?.click();
        }
    }

    /**
     * Shows either all tracks, matched tracks, excluded tracks or included tracks
     * @param kind What kind of tracks to show
     */
     async showTracks(kind: TrackKind) {
        // Make sure we have a playlist and that we can select the requested tracks
        if (!this.playlists.loaded || (!this.playlists.loaded.filters && (kind == 'excluded' || kind == 'included')))
            return false;

        this.tracks.loading = true;

        // Remove all elements from the observer
        for (const item of document.getElementsByClassName("track")) {
            this.tracks.observer.unobserve(item);
        }

        this.tracks.kind = kind;
        await this.$nextTick();

        // Get the tracks we want to show
        this.tracks.items = await this.playlists.loadPlaylistTracks(kind, 0);

        // Set the min height of the track list
        this.rendered.min_height = (document.getElementsByClassName("track")[0].clientHeight || 0)
                                   * this.tracks.items.length;

        // Check if the number of tracks loaded is enough to satisfy the threshold or total. If not, still loading
        this.tracks.loading = !(
            this.rendered.total > this.rendered.threshold ||
            this.tracks.items.length < this.rendered.total
        );

        this.$nextTick(() => {
            // Observe all items
            for (const item of document.getElementsByClassName("track")) {
                this.tracks.observer.observe(item);
            }
        })

        // Make sure we have the tracks select element
        if (!this.$refs.shownTracksSelect)
            return false;

        return true;
    }

    /**
     * Removes one or more tracks from the shown list
     * @param tracks Tracks to remove from the shown list. If not provided, all currently shown tracks will be removed
     */
    removeTracks(tracks: CTrack[] | PartialTrackList | undefined = undefined) {
        switch (this.tracks.kind) {
            case "all": break;
            case "matched":
                tracks = tracks || this.playlists.loaded.matched_tracks;
                this.playlists.removeMatched(tracks)
                break;
            case "excluded":
                tracks = tracks || this.playlists.loaded.excluded_tracks;
                this.playlists.removeExcluded(tracks)
                break;
            case "included":
                tracks = tracks || this.playlists.loaded.included_tracks;
                this.playlists.removeIncluded(tracks)
                break;
        }

        this.$nextTick(() => this.showTracks(this.tracks.kind))
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

        // If there are no tracks, stop
        if (this.tracks.items.length == 0) return;

        // If there are as much elements as there are tracks, load only those who are intersecting
        if (elements.length == this.tracks.items.length) {
            // Get the indexes of the visible elements
            this.tracks.visible = elements.filter(e => e.isIntersecting).map(e => parseInt(e.target.id));
        }

        // For each element, if intersecting, add, else remove
        else {
            for (const element of elements) {
                const index = parseInt(element.target.id);
                if (element.isIntersecting && !this.tracks.visible.includes(index))
                    this.tracks.visible.push(index);
                else if (!element.isIntersecting && this.tracks.visible.includes(index)) {
                    this.tracks.visible.splice(this.tracks.visible.indexOf(index), 1);
                }
            }
        }

        // We load tracks in batches of batchLoadingSize. Calculate if the next and previous 5 tracks are loaded
        const prev = Math.max(Math.min(...this.tracks.visible) - 10, 0);
        const next = Math.min(Math.max(...this.tracks.visible) + 10, this.tracks.items.length - 1);

        /* If next is -Infinity, the position of the scrollbar is outside that of the rendered tracks threshold.
         * Increase the threshold and retry */
        if (next == -Infinity && this.rendered.total < this.tracks.items.length) {
            this.rendered.total += this.rendered.increase;
            return
        }

        // If the next track is `rendered.total - rendered.threshold` away from the end, increase the amount of rendered tracks
        if (next > this.rendered.total - this.rendered.threshold) {
            this.rendered.total += this.rendered.increase;

            // The InteractionObserver needs to know of the new elements. Call this function to do that
            this.showTracks(this.tracks.kind);
        }

        // Yeah that's not a valid offset
        if (prev == Infinity || next == -Infinity) return;

        const batchLoadingSize = 50;

        // If the previous or next tracks are not loaded, load them
        for (const location of [prev, next]) {
            const item = this.tracks.items[location];
            if (item == null || typeof item === 'string') {
                const offset = Math.floor(location / batchLoadingSize) * batchLoadingSize;
                // If the tracks are not already loading, load them
                if (!(`${this.tracks.kind}-${offset}` in this.loadingQueue)) {
                    this.loadingQueue[`${this.tracks.kind}-${offset}`] = true;
                    // Load the tracks and remove the from the loading queue on finish
                    this.playlists.loadPlaylistTracks(this.tracks.kind, offset).then(() => {
                        delete this.loadingQueue[`${this.tracks.kind}-${offset}`];
                    });
                }
            }
        }
    }

    /**
     * Whether a track is visible or not
     * @param index Index of the track
     * @param margin Margin around the track
     */
    isVisibleTrack(index: number, margin: number = 12) {
        return this.tracks.visible.includes(index) ||
                 (index > Math.min(...this.tracks.visible) - margin &&
                  index < Math.max(...this.tracks.visible) + margin);
    }

    /** Registers triggers */
    registerTriggers() {
        /** Intersection observer to detect when the playlist toolbar is behaving sticky */
        new IntersectionObserver(([e]) => {this.playlistToolbarSticky = e.intersectionRatio < 1 }, {
            root: document.getElementById("playlist-wrapper")!,
            threshold: [1]
        }).observe(document.getElementById("playlist-toolbar")!);

        /** Intersection observer to detect when tracks are scrolled into view */
        this.tracks.observer = new IntersectionObserver(elements => {this.loadVisibleTracks(elements);}, {
            root: document.getElementById("playlist-wrapper")!,
        });

        /** Trigger a disable of the observer for all tracks */
        watch(() => this.editor.executing, () => {
            // If we just started executing a filter, stop observing all tracks
            if (this.editor.executing)
                for (const item of document.getElementsByClassName("track"))
                    this.tracks.observer.unobserve(item);

            // We are done processing the filter, restart observing
            else
                this.showTracks(this.tracks.kind);
        })
    }

    /** Filters the list of tracks based on their name */
    async searchQuery(query: string) {
        this.search.query = query;
        // If there are still strings or nulls in the current playlist, it is not fully loaded
        if (this.playlists.loaded.all_tracks.filter(t => typeof t === 'string' || t === null).length > 0) {
            // Filter the tracks based on the query
            await this.playlists.loadPlaylist_allTracks();
        }

        // Wait for all tracks to be processed
        await this.showTracks(this.tracks.kind);

        // If the search query is empty, show all tracks
        if (query == '') {
            this.tracks.visible = [];
            this.tracks.items = await this.playlists.loadPlaylistTracks(this.tracks.kind, 0);
        } else {
            // Load all the tracks (again) and filter them
            let filtered = await this.playlists.loadPlaylistTracks(this.tracks.kind, 0);
            this.tracks.items = filtered.filter(track => (track as CTrack).name.toLowerCase().includes(query.toLowerCase()));
        }
    }

    /** Opens the search bar */
    async searchShow() {
        this.search.query = '';
        this.search.shown = true;
        await this.$nextTick();
        (this.$refs['search-input'] as HTMLInputElement)!.focus();
    }

    /** Tries to close the search bar */
    searchTryClose() {
        if (this.search.query == '')  {
            this.search.query = null;
            // Wait for the transition to finish
            // setTimeout(() => this.search.shown = false, 500);
            this.search.shown = false;
        }
    }

    convertToNormal() {
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

    deleteTimer = 0;
    startDeleteTimeout() {
        this.deleteTimer = 3;
        const interval = setInterval(() => {
            this.deleteTimer--;
            if (this.deleteTimer == 0) clearInterval(interval);
        }, 1000);
    }
}

export default toNative(Playlist);
</script>

<style lang="scss" scoped>
header #header-artwork {
    box-shadow: 0 4px 60px #000c;
    height: 230px;
    width: 230px;
}
main.small {
    .small-header {
        align-items: center;
        flex-direction: column;
    }
    .small-hide {
        display: none;
    }
}

.search-enter-active,
.search-leave-active {
    transition: width 0.5s;
}

.search-enter-from,
.search-leave-to {
    width: 1rem;
}

.search-enter-to,
.search-leave-from {
    width: 12rem;
}
</style>