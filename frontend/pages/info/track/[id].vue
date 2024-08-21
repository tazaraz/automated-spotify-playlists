<template>
    <article key="track" class="rounded-2 p-2 bg-dark flex-grow-1 overflow-hidden">
        <SmallHeader :item="track"></SmallHeader>
        <div class="h-100 pb-4 d-flex flex-column overflow-y-auto overflow-hidden placeholder-glow" data-edit-class="full-d-none">
            <Title v-if="!track">Loading track...</Title>
            <Title v-else>{{ track.name }}</Title>
            <header class="p-4 pt-5 d-flex gap-4" data-main-class="normal-flex-row normal-align-items-stretch tiny-flex-column tiny-align-items-center">
                <Image :src="track"/>
                <div class="flex-fill d-flex flex-column text-white">
                    <span v-if="!track" class="mt-auto mb-auto placeholder rounded-2" style="width: 17rem; height: 2rem"></span>
                    <h1 v-else class="mt-auto mb-auto">{{ track.name }}</h1>
                    <Spotify v-if="track" :to="`https://open.spotify.com/track/${track.id}`" class="mt-2 mb-3">SHOW IN SPOTIFY</Spotify>
                </div>
            </header>
            <div class="d-flex mb-4 flex-wrap">
                <div class="m-4 mt-0">
                    <h4 v-if="track && track.album" class="text-white p-2 pb-0">Album</h4>
                    <ul class="d-flex m-0 nav row flex-nowrap">
                        <li v-if="!track || !track.album" class="col-12">
                            <span class="placeholder bg-light" style="width: 3rem; height: 3rem"></span>
                            <span class="placeholder ms-3" style="width: 7rem;"></span>
                        </li>
                        <li v-else class="col-auto p-2 d-flex">
                            <Image :src="track.album" class="border" style="width: 3rem; height: 3rem" />
                            <url :to="`/info/album/${track.album.id}`" class="ms-3 m-auto">{{ track.album.name }}</url>
                        </li>
                    </ul>
                </div>
                <div class="m-4 mt-0">
                    <h4 v-if="track && track.artists" class="text-white p-2 pb-0">Artist{{ track.artists.length == 1 ? '' : 's' }}</h4>
                    <ul class="d-flex m-0 nav row" data-main-class="sm-flex-wrap flex-nowrap">
                        <li v-if="!track || !track.artists" class="col-12">
                            <span class="placeholder rounded-5 bg-light" style="width: 3rem; height: 3rem"></span>
                            <span class="placeholder rounded-2 ms-3" style="width: 7rem;"></span>
                        </li>
                        <li v-else v-for="artist of track.artists" class="col-auto p-2 d-flex">
                            <Image :src="artist" class="border rounded-5" style="width: 3rem; height: 3rem" />
                            <url :to="`/info/artist/${artist.id}`" class="rounded-2 ms-3 m-auto">{{ artist.name }}</url>
                        </li>
                    </ul>
                </div>
            </div>
            <div class="row placeholder-glow" style="max-width: 60rem;" data-main-class="large-m-5 large-mt-3 normal-m-5 normal-mt-3 tiny-m-4 tiny-mt-3">
                <div class="col-12 mb-2 multilayer">
                    <span>
                        Track ID
                    </span>
                    <span v-if="!track" class="placeholder rounded-1"></span>
                    <span v-else>{{ track.id }} </span>
                </div>
                <div class="col-12 mb-2 multilayer">
                    <InfoTooltip description="Genres of all artists who contributed to the album this track belongs to.">Album Genres</InfoTooltip>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ albumGenres }}</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoTooltip :description="Filters.Track.BPM.description">BPM</InfoTooltip>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round(track.features.tempo) }}</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoTooltip :description="Filters.Track.Popularity.description">Popularity</InfoTooltip>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ track.popularity / 10 }} / 10</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoTooltip :description="Filters.Track.Danceability.description">Danceability</InfoTooltip>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round(track.features.danceability * 100) / 10 }} / 10</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoTooltip :description="Filters.Track.Positivity.description">Positivity</InfoTooltip>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round(track.features.valence * 100) / 10 }} / 10</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoTooltip :description="Filters.Track.Energy.description">Energy</InfoTooltip>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round(track.features.energy * 100) / 10 }} / 10</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoTooltip :description="Filters.Track.Accousticness.description">Acoustic</InfoTooltip>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round(track.features.acousticness * 100) / 10 }} / 10</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoTooltip :description="Filters.Track.Vocality.description">Vocals</InfoTooltip>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round((1 - track.features.instrumentalness) * 100) / 10 }} / 10</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoTooltip :description="Filters.Track.Liveness.description">Live</InfoTooltip>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round(track.features.liveness * 100) / 10 }} / 10</span>
                </div>
            </div>
            <template v-if="appearsIn.length > 0">
                <h4 class="text-white ms-3 ps-2 pb-2">Appears in:</h4>
                <ol class="nav nav-pills flex-column h-100 ms-5 d-block">
                    <li v-for="playlist in appearsIn" class="nav-item cursor-pointer mb-3">
                        <url :to="`/info/playlist/${playlist.id}`" class="d-flex">
                            <img class="rounded-1" style="width: 3.2rem" :src="playlist.image">
                            <span class="m-auto ms-3">{{ playlist.name }}</span>
                        </url>
                    </li>
                </ol>
            </template>
            <h4 v-else class="text-white ms-3 ps-2 pb-2">This track does not appear in any of your playlists</h4>
            <InfoTestitem kind="track" :id="$route.params.id"></InfoTestitem>
        </div>
    </article>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import { CArtist, CTrack, CTrackFeatures } from "~/../backend/src/shared/types/client";
import { FilterDescriptions as Filters } from '~/../backend/src/shared/types/descriptions';
import BreadCrumbs from '~/stores/breadcrumbs';
import Fetch from '~/stores/fetch';
import Layout from '~/stores/layout';
import Playlists, { CPlaylist } from '~/stores/playlists';
import User from '~/stores/user';

export default class InfoTrack extends Vue {
    breadcrumbs: BreadCrumbs = null as any;
    playlists: Playlists = null as any;
    layout: Layout = null as any;

    track: CTrack = null as any;
    albumGenres!: string
    appearsIn: CPlaylist[] = [];

    Filters = Filters;

    async created() {
        if (!process.client) return;
        this.playlists = new Playlists();
        this.playlists.setUser(new User())
        await this.playlists.loadUserPlaylists();
        this.breadcrumbs = new BreadCrumbs();
        this.layout = new Layout();

        // Get the track and the image
        const response = await Fetch.get<CTrack>(`spotify:/tracks/${this.$route.params.id}`);
        if (response.status !== 200)
            throw createError({ statusCode: 404, message: response.statusText, fatal: true })

        this.track = response.data;
        this.track.image = Fetch.bestImage(this.track.album!.images);

        // Store the breadcrumb
        this.breadcrumbs.add(`/info/track/${this.track.id}`, this.track.name)

        // Get the album image
        this.track.album!.image = Fetch.bestImage(this.track.album!.images);

        // Get the artists, their images, and calculate the genres
        Fetch.get<CArtist[]>(`spotify:/artists`, { ids: this.track.artists!.map(artist => artist.id) })
        .then(response => {
            // Resort the artists to match the order of the track
            response.data.sort((a, b) => this.track!.artists!.findIndex(artist => artist.id === a.id) - this.track!.artists!.findIndex(artist => artist.id === b.id))
            this.track!.artists = response.data;
            this.track!.artists?.forEach(artist => artist.image = Fetch.bestImage(artist.images))
            const genres = response.data.map(a => a.genres).flat().filter((v, i, a) => a.indexOf(v) === i);
            this.albumGenres = genres.join(', ') || "No genres have been found";

            // Get the track features
            Fetch.get<CTrackFeatures>(`spotify:/audio-features/${this.$route.params.id}`).then(response => {
                this.track!.features = response.data;
            })
        })

        this.appearsIn = await this.playlists.trackAppearsIn(this.track!.id);
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