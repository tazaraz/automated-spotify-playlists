<template>
    <article key="album" class="rounded-2 p-2 bg-dark-subtle flex-grow-1 overflow-hidden">
        <SmallHeader :item="album"></SmallHeader>
        <div class="h-100 pb-4 d-flex flex-column overflow-y-auto overflow-hidden placeholder-glow" data-edit-class="full-d-none">
            <Title v-if="!album">Loading album...</Title>
            <Title v-else>{{ album.name }}</Title>
            <header class="p-4 pt-5 d-flex gap-4" data-main-class="normal-flex-row normal-align-items-stretch tiny-flex-column tiny-align-items-center">
                <Image :src="album"/>
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
                            <span class="rounded-2">{{ album.total_tracks }} track{{ album.total_tracks == 1 ? '' : 's' }}</span>
                            <Spotify :to="`https://open.spotify.com/album/${album.id}`" class="mt-2 mb-3">SHOW IN SPOTIFY</Spotify>
                        </div>
                    </template>
                </div>
            </header>
            <h4 v-if="album && album.artists" class="text-white mt-3 ms-3 p-2 pb-0">Artist{{ album.artists.length == 1 ? '' : 's' }}</h4>
            <ol class="m-4 mt-0 d-flex nav row">
                <li v-if="!album || !album.artists" class="col-12">
                    <span class="placeholder rounded-5 bg-light" style="width: 3rem; height: 3rem"></span>
                    <span class="placeholder rounded-2 ms-3" style="width: 7rem;"></span>
                </li>
                <li v-else v-for="artist, index of album.artists" class="col-auto p-2 d-flex">
                    <Image :src="artist" class="rounded-5" style="width: 3rem; height: 3rem" />
                    <span class="multilayer ms-3">
                        <span>{{ index == 0 ? 'Artist' : 'Featuring' }}</span>
                        <url :to="`/info/artist/${artist.id}`" class="rounded-2">{{ artist.name }}</url>
                    </span>
                </li>
            </ol>
            <div class="m-lg-5 mt-lg-3 m-4 mt-3 row placeholder-glow">
                <div class="col-12 mb-2 multilayer">
                    <span>
                        Album ID
                    </span>
                    <span v-if="!album" class="placeholder rounded-1"></span>
                    <span v-else>{{ album.id }} </span>
                </div>
                <div class="col-12 mb-2 multilayer">
                    <InfoTooltip :description="Filters.Album.Genres.description">Genres</InfoTooltip>
                    <span v-if="!album" class="placeholder rounded-1"></span>
                    <span v-else>{{ albumGenres }}</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoTooltip :description="Filters.Album['Release date'].description">Release date</InfoTooltip>
                    <span v-if="!album" class="placeholder rounded-1"></span>
                    <span v-else>{{ (new Date(album?.release_date)).getFullYear() }} </span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoTooltip :description="Filters.Album.Popularity.description">Popularity</InfoTooltip>
                    <span v-if="!album" class="placeholder rounded-1"></span>
                    <span v-else>{{ album.popularity / 10 }} / 10</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoTooltip :description="Filters.Album['Track count'].description">Total tracks</InfoTooltip>
                    <span v-if="!album" class="placeholder rounded-1"></span>
                    <span v-else>{{ album.total_tracks }}</span>
                </div>
            </div>
            <div class="text-white row flex-row m-2">
                <h4 class="m-0 w-auto me-auto">Tracks</h4>
            </div>
            <div class="accordion rounded-5">
                <Track v-for="track, index of tracks" :track="track" :id="index" :deleteable="false">
                </Track>
            </div>
            <InfoTestitem kind="album" :id="$route.params.id"></InfoTestitem>
        </div>
    </article>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import { CAlbum, CArtist, CTrack } from "~/../backend/src/shared/types/client";
import { FilterDescriptions as Filters } from '~/../backend/src/shared/types/descriptions';
import BreadCrumbs from '~/stores/breadcrumbs';
import Fetch from '~/stores/fetch';
import Playlists, { CPlaylist } from '~/stores/playlists';
import User from '~/stores/user';

export default class InfoAlbum extends Vue {
    breadcrumbs: BreadCrumbs = null as any;
    playlists: Playlists = null as any;

    album: CAlbum = null as any;
    albumGenres = '';
    tracks: ({
        appearsIn: CPlaylist[]
    } & CTrack)[] = [];

    Filters = Filters;

    async created() {
        if (!process.client) return;
        this.breadcrumbs = new BreadCrumbs();
        this.playlists = new Playlists();
        this.playlists.setUser(new User())
        await this.playlists.loadUserPlaylists();

        // Get the album and the image
        const response = await Fetch.get<CAlbum>(`spotify:/albums/${this.$route.params.id}`);
        if (response.status !== 200)
            throw createError({ statusCode: 404, message: response.statusText, fatal: true })

        this.album = response.data;
        this.tracks = Array(this.album.total_tracks).fill("");
        this.album.image = Fetch.bestImage(this.album.images);

        // Get the artists and their images
        Fetch.get<CArtist[]>(`spotify:/artists`, { ids: this.album.artists!.map(artist => artist.id) })
        .then(response => {
            this.album!.artists = response.data;
            this.album!.artists?.forEach(artist => artist.image = Fetch.bestImage(artist.images))
            const genres = response.data.map(a => a.genres).flat().filter((v, i, a) => a.indexOf(v) === i);
            this.albumGenres = genres.join(', ') || "No genres. Try an artist."
        })

        // Get the tracks
        Fetch.get<CTrack[]>(`spotify:/albums/${this.$route.params.id}/tracks`, { pagination: true })
        .then(async response => {
            this.tracks = await Promise.all(Fetch.format(response.data).map(async t => ({
                ...t,
                album: this.album,
                image: this.album.image,
                appearsIn: await this.playlists.trackAppearsIn(t.id)
            })));
        })

        this.breadcrumbs.add(`/info/album/${this.album.id}`, this.album.name)
    }
}
</script>

<style lang="scss" scoped>
.image {
    width: 230px;
    height: 230px;
    box-shadow: 0 4px 60px rgba(0,0,0,.8);
}
a {
    color: $gray-500;
    &:hover {
        color: $white;
        text-decoration: underline;
    }
}

@include media-breakpoint-down(lg) {
    .image {
        width: 190px;
        height: 190px;
    }
}
</style>