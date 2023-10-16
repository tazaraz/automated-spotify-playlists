<template>
    <div v-if="user && player" class="nav flex-shrink-0 flex-grow-1 d-flex align-items-center flex-nowrap ms-2" style="max-width: 16rem;">
        <template v-if="user.info">
            <span class="now-playing" data-sidebar-class="tiny-d-none">Now playing</span>
            <url @click="breadcrumbs.clear()" :to="`/info/track/${player.track.id}`" class="loading-container">
                <Image :src="player"/>
            </url>
            <span class="multilayer ms-3 pe-3" data-sidebar-class="tiny-d-none">
                <url @click="breadcrumbs.clear()" :to="`/info/track/${player.track.id}`" class="text-truncate text-white">{{ player.track.name }}</url>
                <div class="text-truncate">
                    <template v-for="(artist, index) in player.artists">
                        {{ index > 0 ? ", " : "" }}
                        <url @click="breadcrumbs.clear()" :to="`/info/artist/${artist.id}`">{{ artist.name }}</url>
                    </template>
                </div>
            </span>
        </template>
    </div>
    <div v-else></div>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import BreadCrumbs from '~/stores/breadcrumbs';
import Fetch from '~/stores/fetch';
import User from '~/stores/user';

export default class ToolbarPlaying extends Vue {
    user: User = null as any;
    breadcrumbs: BreadCrumbs = null as any;

    player: {
        image: string
        track: {
            name: string
            id: string
        }
        artists: {
            name: string
            id: string
        }[]
    } | null = null;

    static interval: NodeJS.Timer | null = null;

    created() {
        this.user = new User();
        this.breadcrumbs = new BreadCrumbs();
        if (ToolbarPlaying.interval) clearInterval(ToolbarPlaying.interval);

        // Try to update the player every 10 seconds
        this.updatePlayer();
        ToolbarPlaying.interval = setInterval(() => {
            if (this.user.dataExists()) {
                this.updatePlayer();
            }
        }, 10000);
    }

    updatePlayer() {
        Fetch.get('spotify:/me/player/currently-playing')
        .then(response => {
            // Do preparations
            if (response.status !== 200) return;
            else if (!response.data?.item) return;
            // Update the player if necessary
            else if (!this.player) this.player = {} as any;
            else if (this.player.track.id === response.data.item.id) return;

            const track = response.data.item;
            this.player!.image = Fetch.bestImage(track.album.images);
            this.player!.track = {
                name: track.name,
                id: track.id
            }
            this.player!.artists = track.artists.map((artist: any) => { return {
                name: artist.name,
                id: artist.id
            }})
        })
    }

    randomBetween(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1) + min);
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