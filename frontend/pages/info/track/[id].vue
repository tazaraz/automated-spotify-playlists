<template>
    <article key="track" class="h-100 p-4 d-flex flex-column overflow-y-auto overflow-hidden placeholder-glow">
        <Title v-if="!track">Loading track...</Title>
        <Title v-else>{{ track.name }}</Title>
        <header class="small-header d-flex p-4 pt-5 gap-4 mb-3">
            <Image id="header-artwork" class="ms-sm-4" :src="track?.image"/>
            <div class="flex-fill d-flex flex-column text-white placeholder-glow my-auto">
                <span v-if="!track"
                        class="mt-auto mb-auto placeholder rounded-2"
                        style="width: 17rem; height: 2rem"></span>
                <template v-else>
                    <h1 class="mt-auto mb-auto">{{ track.name }}</h1>
                    <SpotifyLink v-if="track"
                                    :to="`https://open.spotify.com/track/${track.id}`"
                                    class="mt-2 mb-3">SHOW IN SPOTIFY</SpotifyLink>
                </template>
            </div>
        </header>

        <div class="d-flex mb-4 flex-wrap">
            <div class="m-4 mt-0">
                <h4 v-if="track?.album" class="text-white p-2 pb-0">Album</h4>
                <ul class="d-flex m-0 nav row flex-nowrap">
                    <li v-if="!track?.album" class="col-12">
                        <span class="placeholder bg-light" style="width: 3rem; height: 3rem"></span>
                        <span class="placeholder ms-3" style="width: 7rem;"></span>
                    </li>
                    <li v-else class="col-auto p-2 d-flex">
                        <Image :src="track.album.image" class="border" style="width: 3rem; height: 3rem" />
                        <url :to="`/info/album/${track.album.id}`" class="ms-3 m-auto">{{ track.album.name }}</url>
                    </li>
                </ul>
            </div>
            <div class="m-4 mt-0">
                <h4 v-if="track && track.artists" class="text-white p-2 pb-0">Artist{{ track.artists.length == 1 ? '' : 's' }}</h4>
                <ul class="d-flex m-0 nav row">
                    <li v-if="!track?.artists" class="col-12">
                        <span class="placeholder rounded-5 bg-light" style="width: 3rem; height: 3rem"></span>
                        <span class="placeholder rounded-2 ms-3" style="width: 7rem;"></span>
                    </li>
                    <li v-else v-for="artist of track.artists" class="col-auto p-2 d-flex">
                        <Image :src="artist.image" class="border rounded-5" style="width: 3rem; height: 3rem" />
                        <url :to="`/info/artist/${artist.id}`" class="rounded-2 ms-3 m-auto">{{ artist.name }}</url>
                    </li>
                </ul>
            </div>
        </div>
        <div class="row placeholder-glow mb-3 mx-4" style="max-width: 60rem;">
            <div class="col-12 mb-2 multilayer">
                <span>
                    Track ID
                </span>
                <span v-if="!track" class="placeholder rounded-1"></span>
                <span v-else>{{ track.id }} </span>
            </div>
            <div class="mb-4 multilayer">
                <ToolTip :description="Filters.Album.Genres.description">Album Genres</ToolTip>
                <span v-if="!track?.features" class="placeholder rounded-1"></span>
                <span v-else>{{ albumGenres }} </span>
            </div>
            <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                <ToolTip :description="Filters.Track.BPM.description">BPM</ToolTip>
                <span v-if="!track?.features" class="placeholder rounded-1"></span>
                <span v-else>{{ Math.round(track.features.tempo) }}</span>
            </div>
            <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                <ToolTip :description="Filters.Track.Popularity.description">Popularity</ToolTip>
                <span v-if="!track?.album" class="placeholder rounded-1"></span>
                <span v-else>{{ (track.popularity || track.album.popularity) / 10 || '?' }} / 10</span>
            </div>
            <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                <ToolTip :description="Filters.Track.Danceability.description">Danceability</ToolTip>
                <span v-if="!track?.features" class="placeholder rounded-1"></span>
                <span v-else>{{ Math.round(track.features.danceability * 100) / 10 }} / 10</span>
            </div>
            <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                <ToolTip :description="Filters.Track.Positivity.description">Positivity</ToolTip>
                <span v-if="!track?.features" class="placeholder rounded-1"></span>
                <span v-else>{{ Math.round(track.features.valence * 100) / 10 }} / 10</span>
            </div>
            <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                <ToolTip :description="Filters.Track.Energy.description">Energy</ToolTip>
                <span v-if="!track?.features" class="placeholder rounded-1"></span>
                <span v-else>{{ Math.round(track.features.energy * 100) / 10 }} / 10</span>
            </div>
            <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                <ToolTip :description="Filters.Track.Accousticness.description">Acoustic</ToolTip>
                <span v-if="!track?.features" class="placeholder rounded-1"></span>
                <span v-else>{{ Math.round(track.features.acousticness * 100) / 10 }} / 10</span>
            </div>
            <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                <ToolTip :description="Filters.Track.Vocality.description">Vocals</ToolTip>
                <span v-if="!track?.features" class="placeholder rounded-1"></span>
                <span v-else>{{ Math.round((1 - track.features.instrumentalness) * 100) / 10 }} / 10</span>
            </div>
            <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                <ToolTip :description="Filters.Track.Liveness.description">Live</ToolTip>
                <span v-if="!track?.features" class="placeholder rounded-1"></span>
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
        <ItemTest kind="track" :id="$route.params.id"/>
    </article>
</template>

<script lang="ts">
import { Vue, Component, toNative } from 'vue-facing-decorator';
import type { CArtist, CTrack, CTrackFeatures } from "~/../backend/src/shared/types/client";
import { FilterDescriptions as Filters } from '~/../backend/src/shared/types/descriptions';
import Fetch from '~/composables/fetch';
import Layout from '~/stores/layout';
import Playlists, { type CPlaylist } from '~/stores/playlists';
import User from '~/stores/user';

@Component({})
class InfoTrack extends Vue {
    playlists: Playlists = null as any;
    layout: Layout = null as any;

    track: CTrack = null as any;
    albumGenres!: string
    appearsIn: CPlaylist[] = [];

    Filters = Filters;

    async created() {
        this.playlists = new Playlists();
        this.playlists.setUser(new User())
        await this.playlists.loadUserPlaylists();
        this.layout = new Layout();

        // Get the track and the image
        const response = await Fetch.get<CTrack>(`spotify:/tracks/${this.$route.params.id}`);
        if (response.status !== 200)
            throw createError({ statusCode: 404, message: response.statusText, fatal: true })

        this.track = response.data;
        this.track.image = Fetch.bestImage((response.data as any).album.images, "track");

        // Get the album image
        this.track.album!.image = Fetch.bestImage((response.data as any).album.images, "album")

        // Get the artists, their images, and calculate the genres
        Fetch.get<CArtist[]>(`spotify:/artists`, { ids: this.track.artists!.map(artist => artist.id) })
        .then(response => {
            // Resort the artists to match the order of the track
            response.data.sort((a, b) => this.track!.artists!.findIndex(artist => artist.id === a.id) -
                                         this.track!.artists!.findIndex(artist => artist.id === b.id))
            this.track.artists = response.data;
            for (const artist of response.data as any)
                artist.image = Fetch.bestImage(artist.images, "artist")

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

export default toNative(InfoTrack);
</script>

<style scoped lang="scss">
main.small {
    // col-6
    .small-col-6 { flex: 0 0 auto; width: 50%; }
}

main.normal {
    // col-3
    .normal-col-3 { flex: 0 0 auto; width: 25%; }
}

main.large {
    // col-2
    .large-col-2 { flex: 0 0 auto; width: 16.66666667%; }
}
</style>

<style scoped lang="scss">
header #header-artwork {
    box-shadow: 0 4px 60px #000c;
    height: 230px;
    width: 230px;
    :deep(svg) { scale: 50%; }
}
main.small {
    .small-header {
        align-items: center;
        flex-direction: column;
    }
    .small-hide {
        display: none;
    }
}
</style>