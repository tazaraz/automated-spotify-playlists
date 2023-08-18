<template>
    <article key="album" class="rounded-2 p-2 bg-dark-subtle flex-grow-1 overflow-hidden">
        <SmallHeader :item="user"></SmallHeader>
        <div class="h-100 pe-1 pb-4 d-flex flex-column overflow-y-auto overflow-hidden placeholder-glow" data-edit-class="full-d-none">
            <Title v-if="!user">Loading user...</Title>
            <Title v-else>{{ user.name }}</Title>
            <header class="p-4 pt-5 d-flex gap-4" data-main-class="normal-flex-row normal-align-items-stretch tiny-flex-column tiny-align-items-center">
                <Image :src="user" style="font-size: 300%;"/>
                <div class="flex-fill d-flex flex-column text-white">
                    <template v-if="!user">
                        <span class="mt-auto placeholder rounded-2" style="width: 15rem; height:2rem"></span>
                        <div class="mt-5 mb-3">
                            <span class="placeholder rounded-2" style="width: 10rem"></span>
                            &nbsp;&nbsp;━&nbsp;&nbsp;
                            <span class="placeholder rounded-2" style="width: 5rem"></span>
                            &nbsp;&nbsp;━&nbsp;&nbsp;
                            <span class="placeholder rounded-2" style="width: 5rem"></span>
                        </div>
                    </template>
                    <template v-else>
                        <h1 class="mt-auto rounded-2">{{ user.name }}</h1>
                        <div class="d-flex mt-4 mb-3">
                            <span>{{ playlists.length }} playlist{{ playlists.length == 1 ? '' : 's' }}</span>
                            &nbsp;&nbsp;━&nbsp;&nbsp;
                            <span>{{ followers.length }} follower{{ followers.length == 1 ? '' : 's' }}</span>
                            &nbsp;&nbsp;━&nbsp;&nbsp;
                            <InfoField description="Spotify does not allow us to view this information">? following</InfoField>
                        </div>
                    </template>
                </div>
            </header>
            <!-- <h4 v-if="album && album.artists" class="text-white mt-3 ms-3 p-2 pb-0">Artist{{ album.artists.length == 1 ? 's' : '' }}</h4>
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
                        Album ID&nbsp;&nbsp;━&nbsp;&nbsp;
                        <url v-if="album" :to="`https://open.spotify.com/album/${album.id}`" :direct="true" target="_blank" class="text-primary">Spotify</url>
                    </span>
                    <span v-if="!album" class="placeholder rounded-1"></span>
                    <span v-else>{{ album.id }} </span>
                </div>
                <div class="col-12 mb-2 multilayer">
                    <InfoField :description="Filters.Album.Genres.description">Genres</InfoField>
                    <span v-if="!album" class="placeholder rounded-1"></span>
                    <span v-else>{{ album.genres.join(', ') || "No genres. Try an artist." }}</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoField :description="Filters.Album['Release date'].description">Release date</InfoField>
                    <span v-if="!album" class="placeholder rounded-1"></span>
                    <span v-else>{{ (new Date(album?.release_date)).getFullYear() }} </span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoField :description="Filters.Album.Popularity.description">Popularity</InfoField>
                    <span v-if="!album" class="placeholder rounded-1"></span>
                    <span v-else>{{ album.popularity }} / 10</span>
                </div>
                <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                    <InfoField :description="Filters.Album['Track count'].description">Total tracks</InfoField>
                    <span v-if="!album" class="placeholder rounded-1"></span>
                    <span v-else>{{ album.total_tracks }}</span>
                </div>
            </div>
            <div class="text-white row flex-row m-2 mb-0">
                <h4 v-if="album && tracks" class="m-0 w-auto me-auto">Tracks</h4>
                <InfoField description="In how many playlist the track appears" class="col-3 border-start">Playlist count</InfoField>
            </div>
            <ol v-if="tracks" class="m-lg-5 mt-lg-3 m-3 mt-3 placeholder-glow">
                <li v-if="!tracks">
                    <span class="placeholder rounded-2 ms-3" style="width: 7rem;"></span>
                </li>
                <li v-else v-for="track of tracks" class="p-2">
                    <div class="row">
                        <url :to="`/info/track/${track.id}`" class="col rounded-2 ms-3 text-truncate">{{ track.name }}</url>
                        <span class="ps-4 col-1" v-if="track.appearsIn.length > 0">{{ track.appearsIn.length }}</span>
                    </div>
                </li>
            </ol> -->
        </div>
    </article>
</template>
<script lang="ts">
import { createError } from 'nuxt/app';
import { Vue } from 'vue-property-decorator';
import BreadCrumbs from '~/stores/breadcrumbs';
import FetchError from '~/stores/error';
import Fetch from '~/stores/fetch';
import { CPlaylist } from '~/stores/playlists';

interface User {
    id: string;
    name: string;
    image: string | [string, string];
    url: string;
}

export default class InfoUser extends Vue {
    breadcrumbs!: BreadCrumbs;

    playlists: CPlaylist[] = [];
    followers: User[] = [];
    following: User[] = [];

    user: User = null as any;

    async created() {
        if (!process.client) return;
        this.breadcrumbs = new BreadCrumbs();
    }

    async mounted() {
        let response = await Fetch.get(`spotify:/users/${this.$route.params.id}`);
        if (response.status !== 200)
            throw createError({ statusCode: 404, message: response.statusText, fatal: true })

        this.user = this.formatUser(response.data);

        Fetch.get(`spotify:/users/${this.$route.params.id}/playlists`)

        // this.playlists = res[1].data.items.map((playlist: any) => new CPlaylist(playlist));

        response = await Fetch.get('server:/spclient-tokens')

        if (response.status != 200) {
            return FetchError.create({ status: response.status, message: `Failed to get permission keys from Spotify to load the people who follow ${this.user.name}` })
        }

        Fetch.get(`https://spclient.wg.spotify.com/user-profile-view/v3/profile/${this.$route.params.id}/followers`, {
            user: false,
            headers: {
                'accept': 'application/json',
                'app-platform': 'WebPlayer',
                'authorization': 'Bearer ' + response.data.authorization,
                'client-token': response.data.client_token,
                'spotify-app-version': '1.2.19.72.ge5768733',
            }
        })
        .then(result => {
            console.log(result.data.profiles)
            for (const user of result.data.profiles) {
                this.followers.push(this.formatUser(user))
            }
        })
        .catch(err => {
            console.error(err)
        })
    }

    formatUser(user: any): User {
        return {
            id: user.id || user.uri?.replace('spotify:user:', ''),
            name: user.display_name || user.name,
            url: user.external_urls?.spotify || user.uri?.replace('spotify:user:', 'https://open.spotify.com/user/'),
            image: user.image_url || user.images?.length > 0 ? Fetch.bestImage(user.images) : ['far', 'user']
        }
    }
}
</script>
<style lang="scss" scoped>
.image {
    box-shadow: 0 4px 60px rgba(0, 0, 0, .8);
    width: 230px;
    height: 230px;
    border-radius: 100%;
}

@include media-breakpoint-down(lg) {
    .image {
        width: 190px;
        height: 190px;
    }
}
</style>
