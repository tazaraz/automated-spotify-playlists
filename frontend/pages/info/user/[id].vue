<template>
    <article key="album" class="rounded-2 p-2 bg-dark-subtle flex-grow-1 overflow-hidden">
        <SmallHeader :item="loadedUser"></SmallHeader>
        <div class="h-100 pb-4 d-flex flex-column overflow-y-auto overflow-hidden placeholder-glow" data-edit-class="full-d-none">
            <Title v-if="!loadedUser">Loading user...</Title>
            <Title v-else>{{ loadedUser.name }}</Title>
            <header class="p-4 pt-5 d-flex gap-4" data-main-class="normal-flex-row normal-align-items-stretch tiny-flex-column tiny-align-items-center">
                <Image :src="loadedUser" style="font-size: 300%;"/>
                <div class="flex-fill d-flex flex-column text-white">
                    <template v-if="!loadedUser">
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
                        <h1 class="mt-auto rounded-2">{{ loadedUser.name }}</h1>
                        <div class="d-flex mt-2 mb-3">
                            <span>{{ playlists.length }} playlist{{ playlists.length == 1 ? '' : 's' }}</span>
                            &nbsp;&nbsp;━&nbsp;&nbsp;
                            <span>{{ followers.length }} follower{{ followers.length == 1 ? '' : 's' }}</span>
                            &nbsp;&nbsp;━&nbsp;&nbsp;
                            <InfoTooltip description="Spotify does not allow us to view this information">? following</InfoTooltip>
                        </div>
                    </template>
                    <Spotify v-if="loadedUser" :to="`https://open.spotify.com/user/${loadedUser.id}`" class="mt-2 mb-3">SHOW IN SPOTIFY</Spotify>
                </div>
            </header>

            <div>
                <h5 class="text-white mt-3 p-2 pb-0">Playlists (public)</h5>
                <div class="d-flex overflow-auto gap-3 m-3 mt-4">
                    <template v-for="playlist of playlists">
                        <Card :card="{image: playlist.image, title: playlist.name, url: `/info/playlist/${playlist.id}`}" :fallback="['far', 'user']">
                            <span class="word-wrap text-body-secondary">{{ playlist.name }}</span>
                        </Card>
                    </template>
                </div>

                <h5 class="text-white mt-3 p-2 pb-0">Followers</h5>
                <div class="d-flex overflow-auto gap-3 m-3 mt-4">
                    <Card v-for="user of followers" :card="{image: user.image, title: user.name, url: `/info/user/${user.id}`}" :fallback="['far', 'user']">
                        <span class="word-wrap text-body-secondary">{{ user.name }}</span>
                    </Card>
                </div>
            </div>
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
import User from '~/stores/user';

interface LoadedUser {
    id: string;
    name: string;
    image: string | [string, string];
    url: string;
}

export default class InfoUser extends Vue {
    breadcrumbs: BreadCrumbs = null as any;

    playlists: (CPlaylist & {public: boolean})[] = [];
    followers: LoadedUser[] = [];
    following: LoadedUser[] = [];

    user: User = null as any;
    loadedUser: LoadedUser = null as any;

    async created() {
        if (!process.client) return;
        this.user = new User();
        this.breadcrumbs = new BreadCrumbs();
    }

    async mounted() {
        // Get the user
        let response = await Fetch.get(`spotify:/users/${this.$route.params.id}`);
        if (response.status !== 200)
            throw createError({ statusCode: 404, message: response.statusText, fatal: true })

        // Format the response
        this.loadedUser = this.formatUser(response.data);

        // Get the users' playlists
        Fetch.get(`spotify:/users/${this.$route.params.id}/playlists`)
        .then(response => {
            if (response.status !== 200)
                return FetchError.create({ status: response.status, message: response.statusText })

            this.playlists = response.data.items.map((playlist: any) => ({
                id: playlist.id,
                name: playlist.name,
                image: Fetch.bestImage(playlist.images),
                url: playlist.external_urls.spotify,
            }));
        })

        /* Get the users' followers
         * Hacky method which gets a tiny bit more priviliged Spotify token */
        response = await Fetch.get('server:/spclient-tokens')
        if (response.status != 200) {
            return FetchError.create({ status: response.status, message: `Failed to get permission keys from Spotify to load public data for user ${this.loadedUser.name}` })
        }

        Fetch.get(`https://spclient.wg.spotify.com/user-profile-view/v3/profile/${this.$route.params.id}/playlists`, {
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
            // Get the public playlists ids
            const public_playlists = result.data.public_playlists.map((p: any) => p.uri.replace('spotify:playlist:', ''))
            // Only keep the public playlists
            this.playlists = this.playlists.filter(p => public_playlists.includes(p.id))
        })

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
            for (const user of result.data.profiles) {
                this.followers.push(this.formatUser(user))
            }
        })
        .catch(err => {
            console.error(err)
        })
    }

    /**
     * Formats a Spotify user object to a more usable object
     * @param user Spotify user object
     */
    formatUser(user: any): LoadedUser {
        return {
            id: user.id || user.uri?.replace('spotify:user:', ''),
            name: user.display_name || user.name,
            url: user.external_urls?.spotify || (user.uri?.replace('spotify:user:', 'https://open.spotify.com/user/')),
            image: user.image_url || (user.images?.length > 0 ? Fetch.bestImage(user.images) : ['far', 'user'])
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
