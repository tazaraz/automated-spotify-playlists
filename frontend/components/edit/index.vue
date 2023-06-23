<template>
    <article class="rounded-2 ms-xl-2 mt-xl-0 ms-0 mt-2 bg-dark-subtle overflow-hidden">
        <div v-if="playlists" class="h-100 pe-1 overflow-y-auto">
        </div>
    </article>
</template>

<script lang="ts">
import { Vue, Options } from 'vue-property-decorator';
import Playlists from '~/stores/playlists';
import User from '~/stores/user';

interface PlaylistFilterEntry {
    indent: number;
    index: string;
    content: PlaylistStatement | PlaylistCondition;
}


export default class Edit extends Vue {
    playlists!: Playlists;

    created() {
        if (!process.client) return;
        this.playlists = new Playlists();
        this.playlists.setUser(new User());
    }
}
</script>

<style lang="scss">

</style>
