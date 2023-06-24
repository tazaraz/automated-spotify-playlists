<template>
    <nav class="d-flex flex-column text-white h-100">
        <div class="mb-2 me-sm-2 p-3 rounded-3 bg-dark-subtle">
            <div class="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
                <h4 class="ms-3 mb-0" style="width: 3rem"><fa-icon :icon="['fas', 'gear']" style="width: 2rem; padding-right: .5rem;"></fa-icon></h4>
                <h4 class="d-md-block d-sm-none d-block m-0">
                    Smart Playlists
                </h4>
                <button type="button" class="d-sm-none d-block ms-auto me-3 btn-close" data-bs-dismiss="offcanvas"></button>
            </div>
            <hr>
            <ol class="mt-3 nav nav-pills flex-column">
                <li v-for="item in [
                    {name: 'Library', to: '/library', icon: ['fas', 'heart']},
                    {name: 'Search', to: '/info', icon: ['fas', 'search']},
                ]" class="nav-item cursor-pointer">
                    <url class="d-flex align-items-center nav-link ps-0 pe-0" :to="item.to">
                        <h4 class="ms-3 mb-0" style="width: 3rem"><fa-icon :icon="item.icon" style="width: 2rem; padding-right: .5rem;"></fa-icon></h4>
                        <h5 class="d-md-block d-sm-none d-block m-0">{{ item.name }}</h5>
                    </url>
                </li>
            </ol>
        </div>
        <div id="playlists" class="me-sm-2 p-2 rounded-3 bg-dark-subtle h-100 overflow-hidden">
            <ol v-if="playlists && user && user.loggedIn()" class="nav nav-pills d-block overflow-y-auto h-100">
                <div id="playlist-sp-header" class="d-flex flex-md-row flex-sm-column flex-row align-items-center gap-3 p-2">
                    <span class="lh-base flex-grow-1">Smart playlists</span>
                    <url @click="createSmartPlaylist" class="d-md-block d-sm-none d-block rounded-3 text-white p-0 fs-5"><i><fa-icon :icon="['fas', 'plus']" style="width:2rem;"></fa-icon></i></url>
                </div>

                <template v-for="(playlist, index) in playlists.storage" :key="index">
                    <li v-if="playlist.filters" class="nav-item cursor-pointer">
                        <url :to="`/playlist/${playlist.id}`"
                            :class="`ps-2 d-flex align-items-center nav-link${selectedPlaylist == index ? ' active' : ''}`">
                            <Image :source="playlist" class="m-sm-auto m-md-0 rounded-1" />
                            <span class="d-sm-none d-md-block m-auto ms-3 text-truncate">{{ playlist.name }}</span>
                        </url>
                    </li>
                </template>
                <li v-if="playlists.storage?.filter(p => p.filters).length == 0" class="nav-item cursor-pointer d-md-block d-sm-none d-block">
                    <div class="nav-link bg-light-subtle p-3">
                        <span class="me-2 text-body-secondary">You don't have any smart playlists yet.</span>
                        <br><br>
                        <button @click="createSmartPlaylist" class="btn bg-white text-black ps-1"><i><fa-icon :icon="['fas', 'plus']" style="width:2rem;"></fa-icon></i>Create one now</button>
                    </div>
                </li>
                <div id="playlist-sp-header" class="d-md-none d-sm-flex d-none flex-column flex-md-row align-items-center gap-3 mt-2">
                    <url class="d-block border rounded-3 text-white p-2 p-md-0 fs-5"><i><fa-icon :icon="['fas', 'plus']" style="width:2rem;"></fa-icon></i></url>
                </div>
                <h6 class="lh-base mt-3 p-1 pb-0">Normal playlists</h6>
                <template v-for="(playlist, index) in playlists.storage" :key="index">
                    <li v-if="!playlist.filters" class="nav-item cursor-pointer">
                        <url :to="`/playlist/${playlist.id}`"
                            :class="`p-2 d-flex nav-link${selectedPlaylist == index ? ' active' : ''}`">
                            <Image :source="playlist" class="m-sm-auto m-md-0 rounded-1" />
                            <span class="d-sm-none d-md-block m-auto ms-3 text-truncate">{{ playlist.name }}</span>
                        </url>
                    </li>
                </template>
                <li v-if="playlists.storage?.length == 0" class="nav-item cursor-pointer">
                    <div class="nav-link bg-light-subtle p-3">
                        <span class="me-2 text-body-secondary">You don't have any playlists! Create them in Spotify</span>
                    </div>
                </li>
            </ol>
            <ol v-else class="nav nav-pills overflow-y-auto h-100 d-block">
                <li class="nav-item cursor-pointer">
                    <div class="d-md-block d-none pt-3 pb-3 nav-link bg-light-subtle">
                        <span class="text-body">Once logged in, your playlists will appear here</span>
                        <br><br>
                        <button class="btn bg-white text-black" @click="user?.login()">Log in now</button>
                    </div>
                    <div class="d-md-none d-block p-0 pt-3 pb-3 nav-link">
                        <button class="btn bg-white text-black mb-3" @click="user?.login()">Log in now</button>
                        <div class="rounded-1 p-2 bg-light-subtle text-body">Once logged in, your playlists will appear here</div>
                    </div>
                </li>
            </ol>
        </div>
    </nav>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import BreadCrumbs from '~/stores/breadcrumbs';
import Playlists from '~/stores/playlists';
import User from '~/stores/user';

export default class Sidebar extends Vue {
    playlists!: Playlists
    user!: User
    RC = useRuntimeConfig();

    selectedPlaylist = -1;

    async beforeMount() {
        if (!process.client) return;

        this.user = new User()

        watch(() => this.user.info, async () => {
            console.log(this.user.info, this.user.loggedIn())
            if (!this.user.loggedIn()) {
                (new BreadCrumbs()).clear();
                this.playlists.storage = [];
                this.playlists.editing = undefined;
            } else {
                this.playlists = new Playlists();
                this.playlists.setUser(this.user)
                await this.playlists.loadUserPlaylists();
                this.$forceUpdate();
            }
        })
    }

    async createSmartPlaylist() {
        await this.playlists.createSmartPlaylist();
        await navigateTo('/playlist/unpublished')
        console.log(await this.playlists.loadEditingPlaylist('unpublished'));
    }
}
</script>

<style lang="scss" scoped>
nav {
    a {
        cursor: pointer;
    }
}

.image {
    width: 3.5rem;
    height: 3.5rem;
    object-position: 50% 50%;
    object-fit: cover;
}
</style>