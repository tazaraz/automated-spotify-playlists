<template>
    <playlist ref="playlist" :id="$route.params.id">
        <template v-if="playlists && playlists.loaded">
            <template v-if="playlists.loaded.filters">
                <button class="btn btn-primary" @click="setEditedPlaylist($route.params.id)">Edit</button>

            </template>
        </template>
    </playlist>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import Playlists from '~/stores/playlists';
import User from '~/stores/user';

export default class PlaylistWrapper extends Vue {
    playlists!: Playlists

    created() {
        if (!process.client) return;
        this.playlists = new Playlists();
        this.playlists.setUser(new User())
        this.playlists.loadUserPlaylists();
    }

    async setEditedPlaylist(id: string) {
        await this.playlists.loadEditingPlaylist(id);
        (this.$refs.playlist as any).showTracks("matched");
    }
}
</script>
