<template>
    <nav class="d-flex flex-column text-white h-100">
        <div class="mb-2 p-3 rounded-3 bg-dark-subtle">
            <div class="d-flex align-items-center mb-3 text-white text-decoration-none" data-sidebar-class="normal-mb-0 normal-me-auto">
                <url to="/" class="d-flex text-white" @click="tryClose">
                    <h4 class="ms-3 mb-0" style="width: 3rem"><fa-icon :icon="['fas', 'gear']" style="width: 2rem"></fa-icon></h4>
                    <h4 class="m-0" data-sidebar-class="normal-d-block tiny-d-none">
                        Automated Playlists
                    </h4>
                </url>
                <button type="button" id="sidebarClose" class="d-sm-none d-block ms-auto me-3 btn-close" data-bs-dismiss="offcanvas"></button>
            </div>

            <ClientOnly>
                <div class="d-block d-md-none">
                    <hr>
                    <ToolbarPlaying
                        :style="`margin-left: ${layout && layout.sidebar.state == 'tiny' && !layout.app.isMobile ? '-' : ''}0.25rem;`"
                        @click="tryClose"/>
                </div>
            </ClientOnly>

            <div class="d-none d-md-block">
                <hr>
                <ol class="mt-3 nav nav-pills flex-column">
                    <li v-for="item in [
                        {name: 'Library', to: '/library', icon: ['fas', 'heart']},
                        {name: 'Search', to: '/info/search', icon: ['fas', 'search']},
                    ]" class="nav-item cursor-pointer">
                        <url :class="`d-flex align-items-center nav-link ps-0 pe-0${user?.info ? '' : ' disabled'}`" :to="item.to" @click="tryClose">
                            <h4 class="ms-3 mb-0" style="width: 3rem"><fa-icon :icon="item.icon" style="width: 2rem"></fa-icon></h4>
                            <h5 class="m-0" data-sidebar-class="normal-d-block tiny-d-none">{{ item.name }}</h5>
                        </url>
                    </li>
                </ol>
            </div>
        </div>
        <div id="playlists" class="p-2 rounded-3 bg-dark-subtle h-100 overflow-hidden">
            <ol v-if="playlists && user && user.info" class="nav nav-pills d-block overflow-y-auto h-100">
                <li v-for="item in [
                    {name: 'Library', to: '/library', icon: ['fas', 'heart']},
                    {name: 'Search', to: '/info/search', icon: ['fas', 'search']},
                ]" class="d-flex d-md-none nav-item cursor-pointer mt-2">
                    <url :class="`d-flex align-items-center nav-link ps-0 pe-0${user?.info ? '' : ' disabled'}`" :to="item.to" @click="tryClose">
                        <h4 class="ms-3 mb-0" style="width: 3rem"><fa-icon :icon="item.icon" style="width: 2rem"></fa-icon></h4>
                        <h5 class="m-0" data-sidebar-class="normal-d-block tiny-d-none">{{ item.name }}</h5>
                    </url>
                </li>

                <hr class="d-md-none d-block ms-3 me-3">

                <div id="playlist-sp-header" class="d-flex flex-row align-items-center gap-3 p-2" data-sidebar-class="tiny-flex-column normal-flex-row">
                    <span class="lh-base flex-grow-1" data-sidebar-class="tiny-d-none normal-d-block">
                        Automated playlists
                    </span>
                    <span class="lh-base flex-grow-1" data-sidebar-class="tiny-d-block normal-d-none">
                        Auto playlists
                    </span>
                    <url @click="addAutomatedPlaylist" class="rounded-3 text-white p-0 fs-5" data-sidebar-class="normal-d-block tiny-d-none"><i><fa-icon :icon="['fas', 'plus']" style="width:2rem;"></fa-icon></i></url>
                </div>

                <template v-for="(playlist, index) in playlists.storage" :key="index">
                    <li v-if="playlist.filters" class="nav-item cursor-pointer">
                        <url :to="`/playlist/${playlist.id}`" @click="tryClose"
                            class="ps-2 d-flex align-items-center nav-link">
                            <!-- <Image :src="playlist" class="rounded-1" data-sidebar-class="tiny-m-auto normal-m-0"/> -->
                            <Image :src="playlist" data-sidebar-class="tiny-m-auto normal-m-0"/>
                            <span class="m-auto ms-3 text-truncate" data-sidebar-class="tiny-d-none">{{ playlist.name }}</span>
                        </url>
                    </li>
                </template>
                <li class="nav-item cursor-pointer" data-sidebar-class="tiny-d-none">
                    <div v-if="playlists.storage?.filter(p => p.filters).length == 0" class="nav-link bg-light-subtle p-3">
                        <span class="me-2 text-body-secondary">You don't have any automated playlists yet.</span>
                        <br><br>
                        <button @click="addAutomatedPlaylist" class="btn bg-white text-black ps-1"><i><fa-icon :icon="['fas', 'plus']" style="width:2rem;"></fa-icon></i>Create one now</button>
                    </div>
                </li>
                <div id="playlist-sp-header" class="flex-column align-items-center gap-3 mt-2 d-none" data-sidebar-class="tiny-d-flex normal-d-none">
                    <url @click="addAutomatedPlaylist" class="d-block border rounded-3 text-white p-2 fs-5" data-sidebar-class="normal-m-0"><i><fa-icon :icon="['fas', 'plus']" style="width:2rem;"></fa-icon></i></url>
                </div>
                <h6 class="lh-base mt-3 p-1 pb-0">Normal playlists</h6>
                <template v-for="(playlist, index) in playlists.storage" :key="index">
                    <li v-if="!playlist.filters" class="nav-item cursor-pointer">
                        <url :to="`/playlist/${playlist.id}`" @click="tryClose"
                            class="p-2 d-flex nav-link">
                            <Image :src="playlist" data-sidebar-class="tiny-m-auto normal-m-0"/>
                            <span class="m-auto ms-3 text-truncate" data-sidebar-class="tiny-d-none">{{ playlist.name }}</span>
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
                    <div class="pt-3 pb-3 nav-link bg-light-subtle" data-sidebar-class="tiny-d-none normal-d-block">
                        <span class="text-body">Once logged in, your playlists will appear here</span>
                        <br><br>
                        <button class="btn bg-white text-black" @click="user?.login()">Log in now</button>
                    </div>
                    <div class="p-0 pt-3 pb-3 nav-link d-none" data-sidebar-class="tiny-d-block normal-d-none">
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
import Editor from '~/stores/editor';
import Layout from '~/stores/layout';
import Playlists from '~/stores/playlists';
import User from '~/stores/user';

export default class Sidebar extends Vue {
    playlists: Playlists = null as any;
    layout: Layout = null as any;
    user: User = null as any;

    async beforeMount() {
        if (!process.client) return;

        this.user = new User()

        watch(() => this.user.info, () => this.update());
        this.update();
    }

    async update() {
        if (!this.user.info) {
            (new BreadCrumbs()).clear();
            this.$nextTick(() => {
                if (!this.user?.info) {
                    this.$router.push('/');
                }
            })
        } else {
            this.playlists = new Playlists();
            this.playlists.setUser(this.user);
            this.layout = new Layout();
            await this.playlists.loadUserPlaylists();
            this.$forceUpdate();
        }
    }

    async addAutomatedPlaylist() {
        this.playlists.addAutomatedPlaylist();
        await navigateTo('/playlist/unpublished');
        await this.playlists.loadUserPlaylistByID('unpublished');

        // Do not load the config if another is already loaded
        if (this.playlists.loaded.filters !== undefined &&
            this.playlists.loaded.ownership == 'user' &&
            this.playlists.editor.shown == false) {
            // Open the editor
            new Editor().loadConfig(this.playlists.loaded);
        }

        this.tryClose();
    }

    tryClose() {
        document.getElementById('sidebarClose')?.click();
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