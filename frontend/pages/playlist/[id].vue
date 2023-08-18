<template>
    <playlist ref="playlist" :id="$route.params.id">
        <!-- <template v-if="playlists && playlists.loaded">
            <template v-if="playlists.loaded.filters">
                <button class="btn btn-primary d-inline-flex" @click="setEditedPlaylist($route.params.id)">
                    <h5 class="m-0 me-2"><fa-icon :icon="['fas', 'wand-magic']" /></h5>
                    Edit playlist config
                </button>
                <div class="dropdown ms-auto">
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
            </template>
            <button v-else-if="playlistOrigin == 'loved'" class="border-0 bg-transparent p-2" @click="unfollow">
                <fa-icon style="font-size: 130%;" :icon="['fas', 'heart']"></fa-icon>
            </button>
            <button v-else-if="playlistOrigin == 'unloved'" class="border-0 bg-transparent p-2" @click="follow">
                <fa-icon style="font-size: 130%;" :icon="['far', 'heart']"></fa-icon>
            </button>
            <button v-if="playlistOrigin == 'user'" type="button" class="border-0 bg-transparent p-2" data-bs-toggle="modal" data-bs-target="#removeWarning" @click="">
                <fa-icon style="svg { font-size: 130%; color: rgb(155, 0, 0) }" :icon="['fas', 'trash-can']"></fa-icon>
            </button>
            <Modal :icon="['fas', 'trash-can']" icon-style="font-size: 130%; color: rgb(155, 0, 0)">
                <div class="modal-header">
                    <h1 class="modal-title fs-5" id="exampleModalLabel">Modal title</h1>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    123456
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary">Confirm</button>
                    <button type="button" class="btn btn-primary" @click="remove">Confirm</button>
                </div>
            </Modal>
        </template> -->
    </playlist>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import PlaylistDisplay from '~/components/playlist.vue';
import Layout from '~/stores/layout';
import Playlists from '~/stores/playlists';
import User from '~/stores/user';

export default class PlaylistWrapper extends Vue {
    layout!: Layout;
    playlists!: Playlists;
    playlistElement: PlaylistDisplay = null as any;

    playlistOrigin: "user" | "loved" | "unloved" = null as any;

    created() {
        if (!process.client) return;
        this.playlists = new Playlists();
        this.playlists.setUser(new User())
        this.playlists.loadUserPlaylists();
        this.layout = new Layout();
    }

    mounted() {
        if (!process.client) return;
        this.playlistElement = this.$refs.playlist as any;
        watch(() => this.playlists.loaded, () => this.update());
    }

    /** Update whether the user:
     * - is the owner of the playlist
     * - liked the playlist
     * - is info viewing the playlist */
    update() {
        const user = this.playlists.storage.find(playlist => playlist.id === this.playlists.loaded.id) !== undefined;
        const owner = this.playlists.loaded.owner.id === this.playlists.user.info!.id;
        this.playlistOrigin = user && owner ? "user" : user && !owner ? "loved" : "unloved";
    }

    async setEditedPlaylist(id: string) {
        await this.playlists.loadEditingPlaylist(id);
        this.showTracks("all");
        // Click the edit button to try and open the offcanvas edit view
        document.getElementById("toolbar")?.lastChild?.lastChild?.click();
        this.layout.render(null, true)
    }

    showTracks(kind: "all" | "matched" | "excluded" | "included") {
        if (!this.playlists.loaded || this.playlists.loaded.filters == null || !this.$refs.shownTracksSelect)
            return;

        this.playlistElement.showTracks(kind);
        for (const item of this.$refs.shownTracksSelect.children) {
            item.children[0].classList.remove("active");
        }

        const shownTracksSelect = this.$refs.shownTracksSelect.children[kind == "all" ? 0 : kind == "matched" ? 1 : kind == "excluded" ? 2 : 3];
        shownTracksSelect.children[0].classList.add("active");
    }

    remove() {
        this.playlists.delete(this.playlists.loaded)
        this.$router.push("/library");
    }

    unfollow() {
        this.playlists.unfollow(this.playlists.loaded)
        this.playlistOrigin = "unloved";
    }

    follow() {
        this.playlists.follow(this.playlists.loaded)
        this.playlistOrigin = "loved";
    }
}
</script>
