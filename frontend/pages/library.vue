<template>
    <playlist id="library"></playlist>
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
}
</script>
