<template>
    <article key="artist"  class="h-100 p-4 d-flex flex-column overflow-y-auto overflow-hidden placeholder-glow">
        <Title v-if="!artist">Loading artist...</Title>
        <Title v-else>{{ artist.name }}</Title>
        <header class="small-header d-flex p-4 pt-5 gap-4 mb-3">
            <Image id="header-artwork" class="ms-sm-4" :src="artist?.image"/>
            <div class="flex-fill d-flex flex-column text-white placeholder-glow my-auto">
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
                    <SpotifyLink :to="`https://open.spotify.com/artist/${artist.id}`"
                                 class="mt-2 mb-3">SHOW IN SPOTIFY</SpotifyLink>
                </template>
            </div>
        </header>

        <div class="row placeholder-glow mb-3 mx-4" style="max-width: 60rem;">
            <div class="col-12 mb-2 multilayer">
                <span>
                    Artist ID
                </span>
                <span v-if="!artist" class="placeholder rounded-1"></span>
                <span v-else>{{ artist.id }} </span>
            </div>
            <div class="col-12 mb-2 col-4 mb-2 multilayer">
                <ToolTip :description="Filters.Artist.Genres.description">Genres</ToolTip>
                <span v-if="!artist" class="placeholder rounded-1"></span>
                <span v-else>{{ artist.genres.join(', ') || "No genres for this artist" }}</span>
            </div>
            <div class="d-flex">
                <div class="me-5 multilayer">
                    <ToolTip :description="Filters.Artist.Popularity.description">Popularity</ToolTip>
                    <span v-if="!artist" class="placeholder rounded-1"></span>
                    <span v-else>{{ artist!.popularity / 10 }} / 10</span>
                </div>
                <div class="multilayer">
                    <ToolTip :description="Filters.Artist.Followers.description">Followers</ToolTip>
                    <span v-if="!artist" class="placeholder rounded-1"></span>
                    <span v-else>{{ artist.followers.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") }}</span>
                </div>
            </div>
        </div>

        <div class="row placeholder-glow mb-3 mx-4" style="max-width: 60rem;">
            <h5 class="text-white mt-3 p-2 pb-0">Top Tracks</h5>
            <template v-for="track in topTracks">
                <!-- <div class="accordion">
                    <Track :track="track" :id="track.id"/>
                </div> -->
                <div class="large-col-2 normal-col-5 small-col-6 mb-2 d-flex">
                    <Image :src="track.image" class="mx-2 my-auto" style="width: 2.5rem; height: 2.5rem;"/>
                    <div class="flex-grow-1 multilayer m-0">
                        <div class="text-truncate">
                            <url v-if="track.id"
                                    class="text-white"
                                    :to="`/info/track/${track.id}`">{{ track.name }}</url>
                            <span v-else>{{ track.name }}</span>
                        </div>
                        <div class="text-truncate">
                            <url v-if="track.album?.id"
                                    :to="`/info/album/${track.album.id}`">{{ track.album.name }}</url>
                        </div>
                    </div>
                </div>
            </template>
        </div>

        <div>
            <template v-for="store in [
                // { name: 'Top Tracks', items: topTracks, kind: 'track' },
                { name: 'Albums', items: albums, kind: 'album' },
                { name: 'Related Artists', items: relatedArtists, kind: 'artist' }
            ]" :key="store.name">
                <template v-if="store.items?.length > 0">
                    <h5 class="text-white mt-3 p-2 pb-0">{{ store.name }}</h5>
                    <ol class="nav flex-nowrap overflow-auto ps-2">
                        <url v-for="item of store.items" :to="`/info/${store.kind}/${item.id}`"
                             class="w-25 mb-3" style="min-width: 8rem;">
                            <div class="card h-100 p-3 border-0">
                                <Image :src="item.image" class="rounded-2" style="width: 7rem; height: 7rem;"/>
                                <div class="card-body d-flex flex-column pt-3 p-0">
                                    <h6 class="card-title d-block text-truncate">{{ item.name }}</h6>
                                </div>
                            </div>
                        </url>
                    </ol>
                    <hr>
                </template>
            </template>
        </div>

        <ItemTest kind="artist" :id="$route.params.id"/>
    </article>
</template>

<script lang="ts">
import { Vue, Component, toNative } from 'vue-facing-decorator';
import type { CAlbum, CArtist, CTrack } from "~/../backend/src/shared/types/client";
import { FilterDescriptions as Filters } from '~/../backend/src/shared/types/descriptions';
import Fetch from '~/composables/fetch';
import Playlists from '~/stores/playlists';
import User from '~/stores/user';

@Component({})
class InfoAlbum extends Vue {
    playlists: Playlists = null as any;

    artist: CArtist = null as any;
    topTracks: CTrack[] = null as any;
    albums: CAlbum[] = null as any;
    relatedArtists: CArtist[] = null as any;

    Filters = Filters;

    async created() {
        this.playlists = new Playlists();
        this.playlists.setUser(new User())
        await this.playlists.loadUserPlaylists();

        // Get the artist and the image
        const response = await Fetch.get<CArtist>(`spotify:/artists/${this.$route.params.id}`);
        if (response.status !== 200)
            throw createError({ statusCode: 404, message: response.statusText, fatal: true })

        this.artist = response.data;
        this.artist.followers = (response.data as any).followers.total;
        this.artist.image = Fetch.bestImage((response.data as any).images);

        // Get the top tracks
        Fetch.get<CTrack[]>(`spotify:/artists/${this.$route.params.id}/top-tracks`, {
            query: {
                country: Fetch.user.info!.country
            }
        }).then(res => {
            this.topTracks = res.data;

            // Populate extra data
            for (const track of res.data as any) {
                track.image = Fetch.bestImage(track.album!.images);
                track.duration = this.playlists.formatDuration(track.duration_ms);
            }
        });

        // Get the artist's albums
        Fetch.get<CAlbum[]>(`spotify:/artists/${this.$route.params.id}/albums`, {
            query: {
                include_groups: 'album,single',
                limit: '50'
            }
        }).then(res => {
            this.albums = res.data;

            // Populate extra data
            for (const album of res.data as any) {
                album.image = Fetch.bestImage(album.images);
                album.release_date = (new Date(album.release_date)).getFullYear();
            }
        });

        // Get the related artists
        Fetch.get<CArtist[]>(`spotify:/artists/${this.$route.params.id}/related-artists`).then(res => {
            // Keep only the first 5
            const data = res.data.slice(0, 5);

            // Set the related artists
            this.relatedArtists = data;

            // Populate extra data
            for (const artist of data as any) {
                artist.image = Fetch.bestImage(artist.images);
            }
        });
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
    .normal-col-5 { flex: 0 0 auto; width: 41.66666667%; }
}

main.large {
    // col-2
    .large-col-2 { flex: 0 0 auto; width: 33.33333333%; }
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