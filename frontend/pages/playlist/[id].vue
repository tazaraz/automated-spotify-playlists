<template>
    <playlist :id="$route.params.id">
        <span @click="setEditedPlaylist($route.params.id)">edit</span>
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

    setEditedPlaylist(id: string) {
        this.playlists.loadEditingPlaylist(id)
    }
}
</script>
