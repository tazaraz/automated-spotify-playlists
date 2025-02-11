<template>
    <div v-if="playing" class="d-flex flex-nowrap align-items-center">
        <span class="now-playing m-0 p-0 ps-1">Now playing</span>
        <url :to="`/info/track/${playing.track.id}`" class="loading-container me-2">
            <Image :src="playing.image"/>
        </url>
        <div class="multilayer">
            <url :to="`/info/track/${playing.track.id}`" class="text-truncate text-white">{{ playing.track.name }}</url>
            <div class="text-truncate">
                <template v-for="(artist, index) in playing.artists">
                    {{ index > 0 ? ", " : "" }}
                    <url :to="`/info/artist/${artist.id}`">{{ artist.name }}</url>
                </template>
            </div>
        </div>
    </div>
    <!-- <div v-else class="d-none d-sm-block"></div> -->
</template>

<script lang="ts">
import { Vue, Component, toNative } from 'vue-facing-decorator';
import Fetch from '@/composables/fetch';
import User from '@/stores/user';
import Layout from '~/stores/layout';

interface NowPlayingItem {
    image: string
    track: {
        name: string
        id: string
    }
    artists: {
        name: string
        id: string
    }[]
}

@Component({})
class NowPlaying extends Vue {
    playing: NowPlayingItem = null as any;
    user: User = null as any;
    layout: Layout = null as any;

    interval: NodeJS.Timeout | null = null;

    created() {
        this.user = new User();
        this.layout = new Layout();
        this.update();

        // Update every 5 seconds
        this.interval = setInterval(() => this.update(), 5000);
        // Update when the user logs in or out
        watch(() => this.user.info, () => this.update());
    }

    update() {
        if (this.user.info)
            this.getCurrentlyPlaying();
        else
            this.playing = null as any;
    }

    private getCurrentlyPlaying() {
        Fetch.get('spotify:/me/player/currently-playing')
        .then(response => {
            // Do preparations
            if (response.status !== 200) return;
            else if (!response.data?.item) return;
            // Update the player if necessary
            else if (!this.playing) this.playing = {} as any;
            else if (this.playing.track.id === response.data.item.id) return;

            const track = response.data.item;
            this.playing!.image = Fetch.bestImage(track.album.images);
            this.playing!.track = {
                name: track.name,
                id: track.id
            }
            this.playing!.artists = track.artists.map((artist: any) => { return {
                name: artist.name,
                id: artist.id
            }})
        })
    }

    beforeUnmount() {
        if (this.interval) clearInterval(this.interval);
    }
}

export default toNative(NowPlaying);
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