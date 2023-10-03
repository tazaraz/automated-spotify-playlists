<template>
    <article key="track" class="rounded-2 p-2 bg-dark-subtle flex-grow-1 overflow-hidden">
        <SmallHeader :item="track"></SmallHeader>
        <div class="h-100 pe-1 pb-4 d-flex flex-column overflow-y-auto overflow-hidden placeholder-glow" data-edit-class="full-d-none">
            <Title v-if="!track">Loading track...</Title>
            <Title v-else>{{ track.name }}</Title>
            <header class="p-4 pt-5 d-flex gap-4" data-main-class="normal-flex-row normal-align-items-stretch tiny-flex-column tiny-align-items-center">
                <Image :src="track"/>
                <div class="flex-fill d-flex flex-column text-white">
                    <span v-if="!track" class="mt-auto mb-auto placeholder rounded-2" style="width: 17rem; height: 2rem"></span>
                    <h1 v-else class="mt-auto mb-auto">{{ track.name }}</h1>
                    <div v-if="!track || !track.album" class="d-flex mt-3 mb-3">
                        <span class="placeholder rounded-5 bg-light" style="width: 3rem; height: 3rem"></span>
                        <div class="multilayer ms-3">
                            <span>Album</span>
                            <span class="placeholder rounded-2" style="width: 7rem;"></span>
                        </div>
                    </div>
                    <div v-else class="d-flex mt-3 mb-3">
                        <div class="multilayer ms-3">
                            <span>Album</span>
                            <url :to="`/info/album/${track.album.id}`" class="rounded-2">{{ track.album.name }}</url>
                        </div>
                    </div>
                </div>
            </header>
            <h4 v-if="track && track.artists" class="text-white mt-3 ms-3 p-2 pb-0">Artist{{ track.artists.length == 1 ? 's' : '' }}</h4>
            <ol class="m-4 mt-0 d-flex nav row">
                <li v-if="!track || !track.artists" class="col-12">
                    <span class="placeholder rounded-5 bg-light" style="width: 3rem; height: 3rem"></span>
                    <span class="placeholder rounded-2 ms-3" style="width: 7rem;"></span>
                </li>
                <li v-else v-for="artist of track.artists" class="col-auto p-2 d-flex">
                    <Image :src="artist" class="border rounded-5" style="width: 3rem; height: 3rem" />
                    <url :to="`/info/artist/${artist.id}`" class="rounded-2 ms-3 m-auto">{{ artist.name }}</url>
                </li>
            </ol>
            <div class="row placeholder-glow" style="max-width: 60rem;" data-main-class="large-m-5 large-mt-3 normal-m-5 normal-mt-3 tiny-m-4 tiny-mt-3">
                <div class="col-12 mb-2 multilayer">
                    <span>
                        Track ID&nbsp;&nbsp;━&nbsp;&nbsp;
                        <url v-if="track" :to="`https://open.spotify.com/track/${track.id}`" :direct="true" target="_blank" class="text-primary">Spotify</url>
                    </span>
                    <span v-if="!track" class="placeholder rounded-1"></span>
                    <span v-else>{{ track.id }} </span>
                </div>
                <div class="col-12 mb-2 multilayer">
                    <span>Genres</span>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ trackGenres }} </span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoField :description="Filters.Track.BPM.description">BPM</InfoField>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round(track.features.tempo) }}</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoField :description="Filters.Track.Popularity.description">Popularity</InfoField>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ track.popularity / 10 }} / 10</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoField :description="Filters.Track.Danceability.description">Danceability</InfoField>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round(track.features.danceability * 100) / 10 }} / 10</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoField :description="Filters.Track.Positivity.description">Positivity</InfoField>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round(track.features.valence * 100) / 10 }} / 10</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoField :description="Filters.Track.Energy.description">Energy</InfoField>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round(track.features.energy * 100) / 10 }} / 10</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoField :description="Filters.Track.Accousticness.description">Acoustic</InfoField>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round(track.features.acousticness * 100) / 10 }} / 10</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoField :description="Filters.Track.Vocality.description">Vocals</InfoField>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round((1 - track.features.instrumentalness) * 100) / 10 }} / 10</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoField :description="Filters.Track.Liveness.description">Live</InfoField>
                    <span v-if="!track || !track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round(track.features.liveness * 100) / 10 }} / 10</span>
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
import { Vue } from 'vue-property-decorator';
import { CArtist, CTrack, CTrackFeatures } from "~/../backend/src/shared/types/client";
import { FilterDescriptions as Filters } from '~/../backend/src/shared/types/descriptions';
import BreadCrumbs from '~/stores/breadcrumbs';
import Fetch from '~/stores/fetch';
import Layout from '~/stores/layout';
import Playlists, { CPlaylist } from '~/stores/playlists';
import User from '~/stores/user';

export default class InfoTrack extends Vue {
    breadcrumbs!: BreadCrumbs
    playlists!: Playlists
    layout!: Layout

    track: CTrack = null as any;
    trackGenres!: string
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
            this.track!.artists = response.data;
            this.track!.artists?.forEach(artist => artist.image = Fetch.bestImage(artist.images))
            this.trackGenres = response.data[0].genres.join(', ') || "No genres have been found";

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