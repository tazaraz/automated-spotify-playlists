<template>
    <article key="track" class="rounded-2 p-2 bg-dark-subtle overflow-hidden">
        <div class="h-100 pe-1 pb-4 d-flex flex-column overflow-y-auto overflow-hidden placeholder-glow">
            <Title v-if="!track">Loading track...</Title>
            <Title v-else>{{ track.name }}</Title>
                <Image :source="track"/>
                <div class="flex-fill d-flex flex-column text-white">
                    <span v-if="!track" class="mt-auto mb-auto placeholder rounded-2" style="width: 17rem; height:2rem"></span>
                    <h1 v-else class="mt-auto mb-auto">{{ track.name }}</h1>
                    <div v-if="!track || !track.album" class="d-flex mt-3 mb-3">
                        <span class="placeholder rounded-5 bg-light" style="width: 3rem; height: 3rem"></span>
                        <div class="multilayer ms-3">
                            <span>Album</span>
                            <span class="placeholder rounded-2" style="width: 7rem;"></span>
                        </div>
                    </div>
                    <div v-else class="d-flex mt-3 mb-3">
                        <Image :source="track.album" class="border rounded-5" style="width: 3rem; height: 3rem" />
                        <div class="multilayer ms-3">
                            <span>Album</span>
                            <url :to="`/info/album/${track.album.id}`" class="rounded-2">{{ track.album.name }}</url>
                        </div>
                    </div>
                </div>
            </header>
            <h4 v-if="track && track.artists" class="text-white mt-3 ms-3 p-2 pb-0">Artist{{ track.artists.length > 1 ? 's' : '' }}</h4>
            <ol class="m-4 mt-0 d-flex nav row">
                <li v-if="!track || !track.artists" class="col-12">
                    <span class="placeholder rounded-5 bg-light" style="width: 3rem; height: 3rem"></span>
                    <span class="placeholder rounded-2 ms-3" style="width: 7rem;"></span>
                </li>
                <li v-else v-for="artist of track.artists" class="col-auto p-2 d-flex">
                    <Image :source="artist" class="rounded-5"/>
                    <url :to="`/info/artist/${artist.id}`" class="rounded-2 ms-3 m-auto">{{ artist.name }}</url>
                </li>
            </ol>
            <div class="m-lg-5 mt-lg-3 m-4 mt-3 row placeholder-glow">
                <div class="col-12 mb-2 multilayer">
                    <span>Track ID</span>
                    <span v-if="!track" class="placeholder rounded-1"></span>
                    <span v-else>{{ track.id }} </span>
                </div>
                <div class="col-xxl-2 col-lg-3 col-4 mb-2 multilayer"
                        data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                        :data-bs-title="FilterDescription.Track.Popularity">
                    <span>Popularity</span>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ track!.popularity }}</span>
                </div>
                <div class="col-xxl-2 col-lg-3 col-4 mb-2 multilayer"
                        data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                        :data-bs-title="FilterDescription.Track.Danceability">
                    <span>Danceability</span>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round(track.features.danceability * 100) }}%</span>
                </div>
                <div class="col-xxl-2 col-lg-3 col-4 mb-2 multilayer"
                        data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                        :data-bs-title="FilterDescription.Track.Positivity">
                    <span>Positivity</span>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round(track.features.valence * 100) }}%</span>
                </div>
                <div class="col-xxl-2 col-lg-3 col-4 mb-2 multilayer"
                        data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                        :data-bs-title="FilterDescription.Track.Energy">
                    <span>Energy</span>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round(track.features.energy * 100) }}%</span>
                </div>
                <div class="col-xxl-2 col-lg-3 col-4 mb-2 multilayer"
                        data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                        :data-bs-title="FilterDescription.Track.Duration">
                    <span>Duration</span>
                    <span v-if="!track || !track" class="placeholder rounded-1"></span>
                    <span v-else>{{ playlists.formatDuration(track.duration_ms) }}</span>
                </div>
                <div class="col-xxl-2 col-lg-3 col-4 mb-2 multilayer"
                        data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                        :data-bs-title="FilterDescription.Track.BPM">
                    <span>BPM</span>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round(track.features.tempo) }}</span>
                </div>
                <div class="col-xxl-2 col-lg-3 col-4 mb-2 multilayer"
                        data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                        :data-bs-title="FilterDescription.Track['is Acoustic']">
                    <span>Acoustic</span>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ track.features.acousticness > 0.5 ? "Yes" : "No" }}</span>
                </div>
                <div class="col-xxl-2 col-lg-3 col-4 mb-2 multilayer"
                        data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                        :data-bs-title="FilterDescription.Track['has Vocals']">
                    <span>Vocals</span>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ track.features.instrumentalness > 0.5 ? "No" : "Yes" }}</span>
                </div>
                <div class="col-xxl-2 col-lg-3 col-4 mb-2 multilayer"
                        data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                        :data-bs-title="FilterDescription.Track['is Live']">
                    <span>Live</span>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ track.features.liveness > 0.8 ? "Yes" : "No" }}</span>
                </div>
            </div>
            <template v-if="appearsIn.length > 0">
                <h4 class="text-white ms-3 ps-2 pb-2">Appears in:</h4>
                <ol class="nav nav-pills flex-column h-100 ms-5 d-block">
                    <li v-for="playlist in appearsIn" class="nav-item cursor-pointer mb-3">
                        <url :to="`/info/playlist/${playlist.id}`">
                            <img class="rounded-1" style="width: 3.2rem" :src="playlist.image">
                            <span class="m-auto ms-3 text-truncate">{{ playlist.name }}</span>
                        </url>
                    </li>
                </ol>
            </template>
            <h4 v-else class="text-white ms-3 ps-2 pb-2">This track does not appear in any of your playlists</h4>
        </div>
    </article>
</template>

<script lang="ts">
import { Tooltip } from 'bootstrap';
import { Vue } from 'vue-property-decorator';
import { CArtist, CTrack, CTrackFeatures } from "~/../backend/src/types/client";
import { FilterDescription } from '~/../backend/src/types/descriptions';
import BreadCrumbs from '~/stores/breadcrumbs';
import Fetch from '~/stores/fetch';
import Playlists, { Playlist } from '~/stores/playlists';
import User from '~/stores/user';

export default class InfoTrack extends Vue {
    breadcrumbs!: BreadCrumbs
    playlists!: Playlists

    track: CTrack | null = null;
    trackGenres!: string
    appearsIn: Playlist[] = [];

    tooltipList: Tooltip[] = [];
    FilterDescription = FilterDescription;

    async created() {
        if (!process.client) return;
        this.playlists = new Playlists(new User());
        this.breadcrumbs = new BreadCrumbs();
        await this.playlists.loadUserPlaylists();

        // Get the track and the image
        this.track = (await Fetch.get<CTrack>(`spotify:/tracks/${this.$route.params.id}`)).data;
        this.track.image = Fetch.bestArtwork(this.track.album!.images);

        // Store the breadcrumb
        this.breadcrumbs.add(`/info/track/${this.track.id}`, this.track.name)

        // Get the album image
        this.track.album!.image = Fetch.bestArtwork(this.track.album!.images);

        // Get the artists, their images, and calculate the genres
        Fetch.get<CArtist[]>(`spotify:/artists`, { ids: this.track.artists!.map(artist => artist.id) })
        .then(response => {
            this.track!.artists = response.data;
            this.track!.artists?.forEach(artist => artist.image = Fetch.bestArtwork(artist.images))
            this.trackGenres = response.data[0].genres.join(', ') || "No genres have been found";

            // Get the track features
            Fetch.get<CTrackFeatures>(`spotify:/audio-features/${this.$route.params.id}`).then(response => {
                this.track!.features = response.data;
            })
        })

        this.appearsIn = await this.playlists.trackAppearsIn(this.track.id);
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
    .image {
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
        .image {
            width: 190px;
            height: 190px;
        }
    }
}
</style>