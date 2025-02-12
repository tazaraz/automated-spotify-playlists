<template>
    <article key="artist" class="h-100 p-4 d-flex flex-column overflow-y-auto overflow-hidden placeholder-glow">
        <Title v-if="!loadedUser">Loading user...</Title>
        <Title v-else>{{ loadedUser.name }}</Title>
        <header class="small-header d-flex p-4 pt-5 gap-4 mb-3">
            <Image id="header-artwork" class="ms-4" :src="loadedUser?.image"/>
            <div class="flex-fill d-flex flex-column text-white placeholder-glow my-auto">
                <template v-if="!loadedUser">
                    <span class="mt-auto placeholder rounded-2" style="width: 15rem; height:2rem"></span>
                    <span class="placeholder rounded-2" style="width: 10rem"></span>
                    <div class="mt-5 mb-3">
                        <span class="placeholder rounded-2" style="width: 5rem"></span>
                        &nbsp;&nbsp;━&nbsp;&nbsp;
                        <span class="placeholder rounded-2" style="width: 5rem"></span>
                    </div>
                </template>
                <template v-else>
                    <h1 class="mt-auto rounded-2">{{ loadedUser.name }}</h1>
                    <span class="bg-body-secondary rounded-1 px-2 py-1 text-nowrap" style="width: min-content;">
                        {{ playlists.length }} playlist{{ playlists.length == 1 ? '' : 's' }}
                    </span>
                    <div class="d-flex mt-2 mb-3">
                        <span>{{ loadedUser.followers }}</span>
                        &nbsp;&nbsp;━&nbsp;&nbsp;
                        <ToolTip description="Spotify does not allow us to view this information">? following</ToolTip>
                    </div>
                </template>
                <SpotifyLink v-if="loadedUser"
                             :to="`https://open.spotify.com/user/${loadedUser.id}`"
                             class="mt-2 mb-3">SHOW IN SPOTIFY</SpotifyLink>
            </div>
        </header>

        <div>
            <template v-for="store in [
                // { name: 'Top Tracks', items: topTracks, kind: 'track' },
                { name: 'Playlists (public)', items: playlists, kind: 'playlist' },
                { name: 'Followers', items: followers, kind: 'user' }
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
    </article>
</template>
<script lang="ts">
import { Vue, Component, toNative } from 'vue-facing-decorator';
import Fetch from '~/composables/fetch';
import type { CPlaylist } from '~/stores/playlists';
import User from '~/stores/user';

interface LoadedUser {
    id: string;
    name: string;
    image: string | [string, string];
    url: string;
    followers: string;
}

@Component({})
class InfoUser extends Vue {
    playlists: (CPlaylist & {public: boolean})[] = [];
    followers: LoadedUser[] = [];
    following: LoadedUser[] = [];

    user: User = null as any;
    loadedUser: LoadedUser = null as any;

    async created() {
        this.user = new User();
    }

    async mounted() {
        // Get the user
        let response = await Fetch.get(`spotify:/users/${this.$route.params.id}`);
        if (response.status !== 200)
            Fetch.createError({
                status: response.status,
                title: `Loading user ${this.$route.params.id}`,
                message: response.statusText,
            })

        // Format the response
        this.loadedUser = this.formatUser(response.data);

        // Get the users' playlists
        Fetch.get(`spotify:/users/${this.$route.params.id}/playlists`)
        .then(response => {
            if (response.status !== 200)
                return Fetch.createError({
                    status: response.status,
                    title: `Loading '${this.loadedUser.name}' playlists`,
                    message: response.statusText
                })

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
            return Fetch.createError({
                    status: response.status,
                    message: `Failed to load public data for user ${this.loadedUser.name}`
                })
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
            image: user.image_url || (user.images?.length > 0 ? Fetch.bestImage(user.images) : ['far', 'user']),
            followers: this.prettyCount(user.followers?.total),
        }
    }

    prettyCount(item: null | number | string) {
        if (!item) item = 0;
        const count = item.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        return `${count} follower${item === 1 ? '' : 's'}`;
    }
}

export default toNative(InfoUser);
</script>

<style scoped lang="scss">
header #header-artwork {
    box-shadow: 0 4px 60px #000c;
    height: 230px;
    width: 230px;
    border-radius: 100%;
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
