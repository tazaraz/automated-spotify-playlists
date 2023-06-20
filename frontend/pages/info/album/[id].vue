<template>
    <article key="album" class="rounded-2 p-2 bg-dark-subtle overflow-hidden">
        <div class="h-100 pe-1 pb-4 d-flex flex-column overflow-y-auto overflow-hidden placeholder-glow">
            <Title v-if="!album">Loading album...</Title>
            <Title v-else>{{ album.name }}</Title>
            <header class="p-4 pt-5 d-flex gap-4 flex-column flex-lg-row align-items-center align-items-lg-stretch">
                <div v-if="!album" class="bg-body loading-container">
                    <img src="/loading.svg" style="transform: scale(0.2); box-shadow: none;">
                </div>
                <img v-else :src="album.image"/>
                <div class="flex-fill d-flex flex-column text-white">
                    <template v-if="!album">
                        <span class="mt-auto placeholder rounded-2" style="width: 15rem; height:2rem"></span>
                        <div class="mt-5 mb-3">
                            <span class="placeholder rounded-2" style="width: 5rem"></span>
                            &nbsp;&nbsp;━&nbsp;&nbsp;
                            <span class="placeholder rounded-2" style="width: 10rem"></span>
                        </div>
                    </template>
                    <template v-else>
                        <h1 class="mt-auto rounded-2">{{ album.name }}</h1>
                        <div class="mt-4 mb-3">
                            <span class="rounded-2">{{ new Date(album.release_date).getFullYear() }}</span>
                            &nbsp;&nbsp;━&nbsp;&nbsp;
                            <span class="rounded-2">{{ album.total_tracks }} track{{ album.total_tracks > 1 ? 's' : '' }}</span>
                        </div>
                    </template>
                </div>
            </header>
            <h4 v-if="album && album.artists" class="text-white mt-3 ms-3 p-2 pb-0">Artist{{ album.artists.length > 1 ? 's' : '' }}</h4>
            <ol class="m-4 mt-0 d-flex nav row">
                <li v-if="!album || !album.artists" class="col-12">
                    <span class="placeholder rounded-5 bg-light" style="width: 3rem; height: 3rem"></span>
                    <span class="placeholder rounded-2 ms-3" style="width: 7rem;"></span>
                </li>
                <li v-else v-for="artist, index of album.artists" class="col-auto p-2 d-flex">
                    <img :src="artist.image" class="rounded-5" style="width: 3rem; height: 3rem" />
                    <span class="multilayer ms-3">
                        <span>{{ index == 0 ? 'Artist' : 'Featuring' }}</span>
                        <url :to="`/info/artist/${artist.id}`" class="rounded-2">{{ artist.name }}</url>
                    </span>
                </li>
            </ol>
            <div class="m-lg-5 mt-lg-3 m-4 mt-3 row placeholder-glow">
                <div class="col-12 mb-2 multilayer">
                    <span>Album ID</span>
                    <span v-if="!album" class="placeholder rounded-1"></span>
                    <span v-else>{{ album.id }} </span>
                </div>
                <div class="col-12 mb-2 multilayer"
                        data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                        :data-bs-title="FilterDescription.Album.Genres">
                    <span>Genres</span>
                    <span v-if="!album" class="placeholder rounded-1"></span>
                    <span v-else>{{ album.genres.join(', ') || "No genres. Try the artist." }}</span>
                </div>
                <div class="col-xxl-2 col-4 mb-2 multilayer"
                        data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                        :data-bs-title="FilterDescription.Album['Release date']">
                    <span>Release date</span>
                    <span v-if="!album" class="placeholder rounded-1"></span>
                    <span v-else>{{ (new Date(album?.release_date)).getFullYear() }} </span>
                </div>
                <div class="col-xxl-2 col-4 mb-2 multilayer"
                        data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                        :data-bs-title="FilterDescription.Album.Popularity">
                    <span>Popularity</span>
                    <span v-if="!album" class="placeholder rounded-1"></span>
                    <span v-else>{{ album.popularity }}</span>
                </div>
                <div class="col-xxl-2 col-4 mb-2 multilayer"
                        data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                        :data-bs-title="FilterDescription.Album['Track count']">
                    <span>Total tracks</span>
                    <span v-if="!album" class="placeholder rounded-1"></span>
                    <span v-else>{{ album.total_tracks }}</span>
                </div>
            </div>
            <div class="text-white row">
                <h4 v-if="album && tracks" class="col mt-3 ms-3 p-2 pb-0">Tracks</h4>
                <h6 class="col-2 mt-3 ms-3 p-2 pb-0"
                        data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                        data-bs-title="In how many playlist the track appears">
                        Playlist count
                </h6>
            </div>
            <ol v-if="tracks" class="m-lg-5 mt-lg-3 m-3 mt-3 placeholder-glow">
                <li v-if="!tracks">
                    <span class="placeholder rounded-2 ms-3" style="width: 7rem;"></span>
                </li>
                <li v-else v-for="track of tracks" class="p-2">
                    <div class="row">
                        <url :to="`/info/track/${track.id}`" class="col rounded-2 ms-3 text-truncate">{{ track.name }}</url>
                        <span class="ps-3 col-1" v-if="track.appearsIn.length > 0">{{ track.appearsIn.length }}</span>
                    </div>
                </li>
            </ol>
        </div>
    </article>
</template>

<script lang="ts">
import { Tooltip } from 'bootstrap';
import { Vue } from 'vue-property-decorator';
import { CAlbum, CArtist, CTrack } from "~/../backend/src/types/client";
import { FilterDescription } from '~/../backend/src/types/descriptions';
import BreadCrumbs from '~/stores/breadcrumbs';
import Fetch from '~/stores/fetch';
import Playlists, { Playlist } from '~/stores/playlists';
import User from '~/stores/user';

export default class InfoAlbum extends Vue {
    breadcrumbs!: BreadCrumbs
    playlists!: Playlists

    album: CAlbum | null = null;
    tracks: ({
        appearsIn: Playlist[]
    } & CTrack)[] = [];

    tooltipList: Tooltip[] = [];
    FilterDescription = FilterDescription;

    async created() {
        if (!process.client) return;
        this.breadcrumbs = new BreadCrumbs();
        this.playlists = new Playlists(new User());
        await this.playlists.loadUserPlaylists();

        // Get the album and the image
        this.album = (await Fetch.get<CAlbum>(`spotify:/albums/${this.$route.params.id}`)).data;
        this.album.image = Fetch.bestArtwork(this.album.images);

        // Get the artists and their images
        Fetch.get<CArtist[]>(`spotify:/artists`, { ids: this.album.artists!.map(artist => artist.id) })
        .then(response => {
            this.album!.artists = response.data;
            this.album!.artists?.forEach(artist => artist.image = Fetch.bestArtwork(artist.images))

            // Get the tracks
            Fetch.get<CTrack[]>(`spotify:/albums/${this.$route.params.id}/tracks`, { pagination: true })
            .then(response => {
                response.data.forEach(async track => {
                    this.tracks.push({
                        ...track,
                        // Get the playlists the track appears in
                        appearsIn: await this.playlists.trackAppearsIn(track.id)
                    });
                })
            })
        })

        this.breadcrumbs.add(`/info/album/${this.album.id}`, this.album.name)
    }

    mounted() {
        // Initialize the tooltips
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
        this.tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new this.$bootstrap.Tooltip(tooltipTriggerEl))
    }

    beforeUnmount() {
        this.tooltipList.forEach(tooltip => tooltip.disable());
    }
}
</script>

<style lang="scss" scoped>
header {
    img {
        width: 230px;
        height: 230px;
        box-shadow: 0 4px 60px rgba(0,0,0,.8);
    }
}
a {
    color: $gray-500;
    &:hover {
        color: $white;
        text-decoration: underline;
    }
}

@include media-breakpoint-down(lg) {
    header {
        img {
            width: 190px;
            height: 190px;
        }
    }
}
</style>