<template>
    <nav id="toolbar" class="d-flex gap-3 bg-dark justify-content-between align-items-center rounded-3 mb-2 p-2 ps-3 pe-3">
        <ClientOnly>
            <button class="navbar-toggler d-sm-none" data-bs-toggle="offcanvas" data-bs-target="#sidebar" @click="player.update()">
                <h2 class="p-1 m-0"><fa-icon :icon="['fas', 'bars']"></fa-icon></h2>
            </button>
            <ToolbarPlaying class="d-none d-md-flex"/>
            <span class="d-flex d-md-none">{{ playlists?.loaded?.name }}</span>
            <ToolbarBreadcrumbs class="d-none d-lg-flex"/>
        </ClientOnly>
        <div class="d-flex">
            <div class="nav-item">
                <button v-if="playlists?.storage && playlists?.editor?.playlist" id="mobile-open-edit" class="navbar-toggler d-sm-none h-100 p-2" data-bs-toggle="offcanvas" data-bs-target="#edit">
                    <span class="fs-5"><fa-icon :icon="['fas', 'wand-magic']"></fa-icon></span>
                </button>
            </div>
            <div v-if="user && user.info" class="nav-item cursor-pointer dropdown">
                <button class="btn" data-bs-toggle="dropdown">
                    <span class="d-md-inline d-none me-3">{{ user.info.name }}</span>
                    <i><fa-icon :icon="['fas', 'user']"></fa-icon></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-end py-1" style="z-index: 1030;">
                    <li><url :to="`/info/user/${user.info.id}`" class="dropdown-item">Profile</url></li>
                    <li><button class="dropdown-item" @click="logout()">Log out</button></li>
                </ul>
            </div>
            <div v-else>
                <url to="." class="p-2" @click="user?.login">
                    <span class="me-3">Log in</span>
                    <i><fa-icon :icon="['far', 'user']"></fa-icon></i>
                </url>
            </div>
        </div>
    </nav>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import BreadCrumbs from '~/stores/breadcrumbs';
import NowPlaying from '~/stores/player';
import Playlists from '~/stores/playlists';
import User from '~/stores/user';

export default class Sidebar extends Vue {
    user: User = null as any;
    breadcrumbs: BreadCrumbs = null as any;
    playlists: Playlists = null as any;
    player: NowPlaying = null as any;
    options: { name: string, icon: string[], click: any }[] = []

    async created() {
        if (!process.client) return;

        this.user = new User();
        this.player = new NowPlaying();
        this.breadcrumbs = new BreadCrumbs();
        this.playlists = new Playlists();
        const code = this.$route.query?.code;

        // If there is a code in the url, ask our server for tokens
        if (code){
            window.history.pushState({}, document.title, "/");

            // Request tokens
            const error = await this.user.getTokens(
                useRuntimeConfig().public.SP_CLIENT_ID,
                code as string
            );

            if (!error)
                this.user.finishLogin();
        }
    }

    logout() {
        // Unload everything
        this.user.logout();
        this.playlists.editor = null as any;
        this.player.update();
    }
}
</script>

<style lang="scss" scoped>
#toolbar {
    a {
        cursor: pointer;
    }
}
</style>