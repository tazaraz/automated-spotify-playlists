<template>
    <div v-if="player && player.playing" class="d-flex flex-nowrap align-items-center">
        <span class="now-playing m-0 p-0 ps-1">Now playing</span>
        <url @click="breadcrumbs.clear()" :to="`/info/track/${player.playing.track.id}`" class="loading-container me-2">
            <Image :src="player.playing"/>
        </url>
        <div v-if="!(layout.sidebar.state == 'tiny' && !layout.app.isMobile)" class="multilayer">
            <url @click="breadcrumbs.clear()" :to="`/info/track/${player.playing.track.id}`" class="text-truncate text-white">{{ player.playing.track.name }}</url>
            <div class="text-truncate">
                <template v-for="(artist, index) in player.playing.artists">
                    {{ index > 0 ? ", " : "" }}
                    <url @click="breadcrumbs.clear()" :to="`/info/artist/${artist.id}`">{{ artist.name }}</url>
                </template>
            </div>
        </div>
    </div>
    <div v-else></div>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import BreadCrumbs from '~/stores/breadcrumbs';
import Layout from '~/stores/layout';
import NowPlaying from '~/stores/player';

export default class ToolbarPlaying extends Vue {
    player: NowPlaying = null as any;
    breadcrumbs: BreadCrumbs = null as any;
    layout: Layout = null as any;

    created() {
        this.breadcrumbs = new BreadCrumbs();
        this.player = new NowPlaying();
        this.player.init();
        this.layout = new Layout();
    }
}
</script>
<style lang="scss" scoped>
.loading-container,
.loading-container img,
.loading-container span {
    display: block;
    width: 2.5rem;
    height: 2.5rem;
}

.now-playing {
    width: 2.5rem;
    line-height: normal;
    font-size: 75%;
    font-weight: 500;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    height: min-content;
}

</style>