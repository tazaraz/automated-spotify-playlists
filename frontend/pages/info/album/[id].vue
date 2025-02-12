<template>
    <article key="album" class="h-100 p-4 d-flex flex-column overflow-y-auto overflow-hidden placeholder-glow">
        <Title v-if="!album">Loading album...</Title>
        <Title v-else>{{ album.name }}</Title>
        <header class="small-header d-flex p-4 pt-5 gap-4 mb-3">
            <Image id="header-artwork" class="ms-sm-4" :src="album?.image"/>
            <div class="flex-fill d-flex flex-column text-white placeholder-glow my-auto">
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
                        <SpotifyLink :to="`https://open.spotify.com/album/${album.id}`"
                                     class="mt-2 mb-3">SHOW IN SPOTIFY</SpotifyLink>
                    </div>
                </template>
            </div>
        </header>

        <div class="d-flex mb-4 flex-wrap">
            <div class="m-4 mt-0">
                <h4 v-if="album?.artists" class="text-white p-2 pb-0">Artist{{ album.artists.length == 1 ? '' : 's' }}</h4>
                <ul class="d-flex m-0 nav row">
                    <li v-if="!album?.artists" class="col-12">
                        <span class="placeholder rounded-5 bg-light" style="width: 3rem; height: 3rem"></span>
                        <span class="placeholder rounded-2 ms-3" style="width: 7rem;"></span>
                    </li>
                    <li v-else v-for="artist of album.artists" class="col-auto p-2 d-flex">
                        <Image :src="artist.image" class="border rounded-5" style="width: 3rem; height: 3rem" />
                        <url :to="`/info/artist/${artist.id}`" class="rounded-2 ms-3 m-auto">{{ artist.name }}</url>
                    </li>
                </ul>
            </div>
        </div>

        <div class="row placeholder-glow mb-3 mx-4" style="max-width: 60rem;">
            <div class="col-12 mb-2 multilayer">
                <span>Album ID</span>
                <span v-if="!album" class="placeholder rounded-1"></span>
                <span v-else>{{ album.id }} </span>
            </div>
            <div class="mb-4 multilayer">
                <ToolTip :description="Filters.Album.Genres.description">Album Genres</ToolTip>
                <span v-if="!album" class="placeholder rounded-1"></span>
                <span v-else>{{ albumGenres }} </span>
            </div>


            <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                <InfoTooltip :description="Filters.Album['Release date'].description">Release date</InfoTooltip>
                <span v-if="!album" class="placeholder rounded-1"></span>
                <span v-else>{{ (new Date(album?.release_date)).getFullYear() }} </span>
            </div>
            <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                <InfoTooltip :description="Filters.Album.Popularity.description">Popularity</InfoTooltip>
                <span v-if="!album" class="placeholder rounded-1"></span>
                <span v-else>{{ album.popularity / 10 }} / 10</span>
            </div>
            <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                <InfoTooltip :description="Filters.Album['Track count'].description">Total tracks</InfoTooltip>
                <span v-if="!album" class="placeholder rounded-1"></span>
                <span v-else>{{ album.total_tracks }}</span>
            </div>
        </div>
        <div class="text-white row flex-row m-2">
            <h4 class="m-0 w-auto me-auto">Tracks</h4>
        </div>
        <div class="accordion">
            <Track v-for="track, index of tracks" :track="track" :id="index" :deleteable="false" />
        </div>
        <ItemTest kind="album" :id="$route.params.id"/>
    </article>
</template>

<script lang="ts">
import { Vue, Component, toNative } from 'vue-facing-decorator';
import type { CAlbum, CArtist, CTrack } from "~/../backend/src/shared/types/client";
import { FilterDescriptions as Filters } from '~/../backend/src/shared/types/descriptions';
import Fetch from '~/composables/fetch';
import Playlists, { type CPlaylist } from '~/stores/playlists';
import User from '~/stores/user';

@Component({})
class InfoAlbum extends Vue {
    playlists: Playlists = null as any;

    album: CAlbum = null as any;
    albumGenres = '';
    tracks: ({
        appearsIn: CPlaylist[]
    } & CTrack)[] = [];

    Filters = Filters;

    async created() {
        this.playlists = new Playlists();
        this.playlists.setUser(new User())
        await this.playlists.loadUserPlaylists();

        // Get the album and the image
        const response = await Fetch.get<CAlbum>(`spotify:/albums/${this.$route.params.id}`);
        if (response.status !== 200)
            throw createError({ statusCode: 404, message: response.statusText, fatal: true })

        this.album = response.data;
        this.tracks = Array(this.album.total_tracks).fill("");
        this.album.image = Fetch.bestImage((this.album as any).images);

        // Get the artists and their images
        Fetch.get<CArtist[]>(`spotify:/artists`, { ids: this.album.artists!.map(artist => artist.id) })
        .then(response => {
            this.album!.artists = response.data;
            for (const artist of response.data as any)
                artist.image = Fetch.bestImage(artist.images);

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
    }
}

export default toNative(InfoAlbum);
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