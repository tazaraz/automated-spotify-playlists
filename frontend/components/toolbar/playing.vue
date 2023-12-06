<template>
    <div v-if="player && player.playing" class="nav flex-shrink-0 flex-grow-1 d-flex align-items-center flex-nowrap ms-2" style="max-width: 16rem;">
        <span v-if="!(layout.sidebar.width < layout.sidebar.tiny.min && layout.app.width > layout.app.mobile)" class="now-playing d-md-block d-sm-none d-block">Now playing</span>
        <url @click="breadcrumbs.clear()" :to="`/info/track/${player.playing.track.id}`" class="loading-container">
            <Image :src="player.playing"/>
        </url>
        <span v-if="!(layout.sidebar.width < layout.sidebar.tiny.min && layout.app.width > layout.app.mobile)" class="multilayer ms-3 pe-3">
            <url @click="breadcrumbs.clear()" :to="`/info/track/${player.playing.track.id}`" class="text-truncate text-white">{{ player.playing.track.name }}</url>
            <div class="text-truncate">
                <template v-for="(artist, index) in player.playing.artists">
                    {{ index > 0 ? ", " : "" }}
                    <url @click="breadcrumbs.clear()" :to="`/info/artist/${artist.id}`">{{ artist.name }}</url>
                </template>
            </div>
        </span>
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
    width: 2.5rem;
    height: 2.5rem;
}

.now-playing {
    width: 2.5rem;
    margin-right: 0.5rem;
    line-height: normal;
    font-size: 75%;
    font-weight: 500;
    transform: rotate(-90deg);
}

</style>