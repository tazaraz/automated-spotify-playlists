<template>
    <article key="artist" class="rounded-2 p-2 bg-dark-subtle flex-grow-1 overflow-hidden">
        <SmallHeader :item="artist"></SmallHeader>
        <div class="h-100 pe-1 pb-4 d-flex flex-column overflow-y-auto overflow-hidden placeholder-glow" data-edit-class="full-d-none">
            <Title v-if="!artist">Loading artist...</Title>
            <Title v-else>{{ artist.name }}</Title>
            <header class="p-4 pt-5 d-flex gap-4" data-main-class="normal-flex-row normal-align-items-stretch tiny-flex-column tiny-align-items-center">
                <Image :src="artist" />
                <div class="flex-fill d-flex flex-column text-white">
                    <template v-if="!artist">
                        <span class="mt-auto placeholder rounded-2" style="width: 15rem; height:2rem"></span>
                        <div class="mt-5 mb-3">
                            <span class="placeholder rounded-2" style="width: 5rem"></span>
                            &nbsp;&nbsp;━&nbsp;&nbsp;
                            <span class="placeholder rounded-2" style="width: 10rem"></span>
                        </div>
                    </template>
                    <template v-else>
                        <h1 class="mt-auto rounded-2">{{ artist.name }}</h1>
                        <span class="mt-4 mb-3 rounded-2">Popularity score: {{ artist.popularity }}</span>
                    </template>
                </div>
            </header>
            <div class="m-lg-5 mt-lg-3 m-4 mt-3 row placeholder-glow">
                <div class="col-12 mb-2 multilayer">
                    <span>
                        Artist ID&nbsp;&nbsp;━&nbsp;&nbsp;
                        <url v-if="artist" :to="`https://open.spotify.com/artist/${artist.id}`" :direct="true" target="_blank" class="text-primary">Spotify</url>
                    </span>
                    <span v-if="!artist" class="placeholder rounded-1"></span>
                    <span v-else>{{ artist.id }} </span>
                </div>
                <div class="col-12 mb-2 col-4 mb-2 multilayer">
                    <InfoField :description="Filters.Artist.Genres.description">Genres</InfoField>
                    <span v-if="!artist" class="placeholder rounded-1"></span>
                    <span v-else>{{ artist.genres.join(', ') || "No genres for this artist" }}</span>
                </div>
                <div class="d-flex">
                    <div class="me-5 multilayer">
                        <InfoField :description="Filters.Artist.Popularity.description">Popularity</InfoField>
                        <span v-if="!artist" class="placeholder rounded-1"></span>
                        <span v-else>{{ artist!.popularity / 10 }} / 10</span>
                    </div>
                    <div class="multilayer">
                        <InfoField :description="Filters.Artist.Followers.description">Followers</InfoField>
                        <span v-if="!artist" class="placeholder rounded-1"></span>
                        <span v-else>{{ artist.followers.total.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") }}</span>
                    </div>
                </div>
            </div>
            <div class="accordion accordion-flush">
                <template v-for="store in [
                    { name: 'Top Tracks', items: topTracks, kind: 'track' },
                    { name: 'Albums', items: albums, kind: 'album' },
                    { name: 'Related Artists', items: relatedArtists, kind: 'artist' }
                ]" :key="store.name">
                    <div class="accordion-item bg-transparent">
                        <h2 class="accordion-header pt-2">
                            <button class="accordion-button shadow-none bg-transparent text-white p-2 ps-4 collapsed" type="button" data-bs-toggle="collapse" :data-bs-target="`#artist-${store.kind}`">
                                <h4>{{ store.name }}</h4>
                            </button>
                        </h2>
                        <div :id="`artist-${store.kind}`" class="accordion-collapse collapse">
                            <ol class="m-4 mt-0 d-flex nav row">
                                <template v-if="!store.items">
                                    <li v-for="i in new Array(Math.ceil(Math.random() * 10))" class="col-12 p-2">
                                        <span class="placeholder rounded-5 bg-light" style="width: 3rem; height: 3rem"></span>
                                        <span class="placeholder rounded-2 ms-3" style="width: 7rem;"></span>
                                    </li>
                                </template>

                                <li v-else v-for="item of store.items" class="col-xxl-4 col-12 p-2 d-flex">
                                    <Image :src="item" :class="store.kind == 'track' ? '' : 'rounded-5'" style="width: 3rem; height: 3rem"/>
                                    <span class="multilayer ms-3">
                                        <url :to="`/info/${store.kind}/${item.id}`" class="rounded-2 text-white">{{ item.name }}</url>
                                    </span>
                                </li>
                            </ol>
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </article>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import { CAlbum, CArtist, CTrack } from "~/../backend/src/types/client";
import { Filters } from '~/../backend/src/types/filters';
import BreadCrumbs from '~/stores/breadcrumbs';
import Fetch from '~/stores/fetch';
import Playlists from '~/stores/playlists';
import User from '~/stores/user';

export default class InfoAlbum extends Vue {
    breadcrumbs!: BreadCrumbs
    playlists!: Playlists

    artist: CArtist = null as any;
    topTracks: CTrack[] = null as any;
    albums: CAlbum[] = null as any;
    relatedArtists: CArtist[] = null as any;

    Filters = Filters;

    async created() {
        if (!process.client) return;
        this.breadcrumbs = new BreadCrumbs();
        this.playlists = new Playlists();
        this.playlists.setUser(new User())
        await this.playlists.loadUserPlaylists();

        // Get the artist and the image
        const response = await Fetch.get<CArtist>(`spotify:/artists/${this.$route.params.id}`);
        if (response.status !== 200)
            throw createError({ statusCode: 404, message: response.statusText, fatal: true })

        this.artist = response.data;
        this.artist.image = Fetch.bestImage(this.artist.images);

        // Get the top tracks
        Fetch.get<CTrack[]>(`spotify:/artists/${this.$route.params.id}/top-tracks`, {
            query: {
                country: Fetch.user.info!.country
            }
        }).then(res => {
            // Format the data
            this.topTracks = Fetch.format(res.data);
            // Populate extra data
            this.topTracks.forEach(track => {
                track.image = Fetch.bestImage(track.album!.images);
                track.duration = this.playlists.formatDuration(track.duration_ms);
            });
        });

        // Get the artist's albums
        Fetch.get<CAlbum[]>(`spotify:/artists/${this.$route.params.id}/albums`, {
            query: {
                include_groups: 'album,single',
                limit: '50'
            }
        }).then(res => {
            // Format the data
            this.albums = Fetch.format(res.data);
            // Populate extra data
            this.albums.forEach(album => {
                album.image = Fetch.bestImage(album.images);
                album.release_date = (new Date(album.release_date)).getFullYear();
            });
        });

        // Get the related artists
        Fetch.get<CArtist[]>(`spotify:/artists/${this.$route.params.id}/related-artists`).then(res => {
            // Format the data
            this.relatedArtists = Fetch.format(res.data);
            // Keep only the first 5
            this.relatedArtists = this.relatedArtists.slice(0, 5);
            // Populate extra data
            this.relatedArtists.forEach(artist => {
                artist.image = Fetch.bestImage(artist.images);
            });
        });

        this.breadcrumbs.add(`/info/artist/${this.artist.id}`, this.artist.name)
    }
}
</script>

<style lang="scss" scoped>
header {
    .image {
        width: 230px;
        height: 230px;
        box-shadow: 0 4px 60px rgba(0, 0, 0, .8);
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