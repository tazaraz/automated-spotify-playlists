<template>
    <nav class="d-flex flex-column text-white h-100">
        <div class="mb-2 me-2 p-3 rounded-3 bg-dark-subtle">
            <url to="/" class="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-white text-decoration-none">
                <span class="fs-4">Smart Playlists</span>
            </url>
            <hr>
            <ol class="mt-3 nav nav-pills flex-column">
                <li v-for="item in options" class="nav-item cursor-pointer">
                    <url class="nav-link ps-0 pe-0" :to="item.url">
                        <i><fa-icon :icon="item.icon" style="width: 2rem; padding-right: .5rem;"></fa-icon></i>
                        <span class="me-2">{{ item.name }}</span>
                    </url>
                </li>
            </ol>
        </div>
        <div id="playlists" class="me-2 p-2 rounded-3 bg-dark-subtle h-100 overflow-hidden">
            <ol v-if="playlists && user && user.loggedIn()" class="nav nav-pills overflow-y-auto h-100 d-block">
                <div class="p-2 d-flex align-items-center">
                    <span class="flex-grow-1">Smart playlists</span>
                    <url class="text-white p-0 fs-5"><i><fa-icon :icon="['fas', 'plus']" style="width:2rem;"></fa-icon></i></url>
                </div>
                <template v-for="(playlist, index) in playlists.storage" :key="index">
                    <li v-if="playlist.filters" class="nav-item cursor-pointer">
                        <url :to="`/playlist/${playlist.id}`"
                            :class="`ps-2 d-flex nav-link${selectedPlaylist == index ? ' active' : ''}`">
                            <img class="rounded-1" style="width: 3.2rem" :src="playlist.image">
                            <span class="m-auto ms-3 text-truncate">{{ playlist.name }}</span>
                        </url>
                    </li>
                </template>
                <li v-if="playlists.storage?.filter(p => p.filters).length == 0" class="nav-item cursor-pointer">
                    <div class="nav-link bg-light-subtle p-3">
                        <span class="me-2 text-body-secondary">You don't have any smart playlists yet.</span>
                        <br><br>
                        <button class="btn bg-white text-black ps-1"><i><fa-icon :icon="['fas', 'plus']" style="width:2rem;"></fa-icon></i>Create one now</button>
                    </div>
                </li>
                <h6 class="mt-3 p-2 pb-0">Normal playlists</h6>
                <template v-for="(playlist, index) in playlists.storage" :key="index">
                    <li v-if="!playlist.filters" class="nav-item cursor-pointer">
                        <url :to="`/playlist/${playlist.id}`"
                            :class="`ps-2 d-flex nav-link${selectedPlaylist == index ? ' active' : ''}`">
                            <img class="rounded-1" style="width: 3.2rem" :src="playlist.image">
                            <span class="m-auto ms-3 text-truncate">{{ playlist.name }}</span>
                        </url>
                    </li>
                </template>
                <li v-if="playlists.storage?.length == 0" class="nav-item cursor-pointer">
                    <div class="nav-link bg-light-subtle p-3">
                        <span class="me-2 text-body-secondary">You don't have any playlists! Create in Spotify</span>
                    </div>
                </li>
            </ol>
            <ol v-else class="nav nav-pills flex-column overflow-y-auto h-100 d-block">
                <li class="nav-item cursor-pointer">
                    <div class="pt-3 pb-3 nav-link bg-light-subtle">
                        <span class="text-body">Once logged in, your playlists will appear here</span>
                        <br><br>
                        <button class="btn bg-white text-black" @click="user?.login()">Log in now</button>
                    </div>
                </li>
            </ol>
        </div>
        <!-- {{ playlists }} -->
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

    options: { name: string, icon: string[], url: string }[] = [
        { name: "Library", icon: ["fas", "music"], url: "/library" },
        { name: "Search", icon: ["fas", "search"], url: "/info" },
    ]

    selectedPlaylist = -1;

    async created() {
        if (!process.client) return;

        this.user = new User()
        this.playlists = new Playlists(this.user);
        await this.playlists.loadUserPlaylists();
        this.$forceUpdate();

        watch(() => this.user.info, async () => {
            if (!this.user.loggedIn()) {
                (new BreadCrumbs()).clear();
                this.playlists.storage = [];
                this.playlists.selected = undefined;
            } else {
                this.playlists = new Playlists(this.user);
                await this.playlists.loadUserPlaylists();
            }
        })
    }
}
</script>

<style lang="scss" scoped>
nav {
    a {
        cursor: pointer;
    }
}
</style>