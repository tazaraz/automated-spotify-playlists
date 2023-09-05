<template>
    <nav id="toolbar" class="d-flex bg-dark-subtle justify-content-between align-items-center rounded-3 mb-2">
        <ClientOnly>
            <button class="navbar-toggler d-sm-none ms-3" type="button" data-bs-toggle="offcanvas" data-bs-target="#sidebar">
                <h2 class="m-0 me-2"><fa-icon :icon="['fas', 'bars']"></fa-icon></h2>
            </button>
            <ToolbarPlaying class="ms-2 me-2"/>
            <ToolbarBreadcrumbs class="d-none d-lg-flex me-2"/>
        </ClientOnly>
        <ul class="nav flex-shrink-0 nav-pills overflow-hidden me-3">
            <li v-if="user && user.info" class="nav-item cursor-pointer">
                <url class="nav-link p-2 me-2" @click="user.logout()">
                    <span class="d-md-inline d-none me-3">{{ user.info.name }}</span>
                    <i><fa-icon :icon="['fas', 'user']"></fa-icon></i>
                </url>
            </li>
            <li v-else class="nav-item cursor-pointer me-2">
                <url class="nav-link p-2" @click="user?.login">
                    <span class="me-3">Log in</span>
                    <i><fa-icon :icon="['far', 'user']"></fa-icon></i>
                </url>
            </li>
            <li v-if="playlists && playlists.editing" class="nav-item cursor-pointer">
                <button class="navbar-toggler d-sm-none h-100" type="button" data-bs-toggle="offcanvas" data-bs-target="#edit">
                    <span class="fs-5 ms-1"><fa-icon :icon="['fas', 'wand-magic']"></fa-icon></span>
                </button>
            </li>
        </ul>
    </nav>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import BreadCrumbs from '~/stores/breadcrumbs';
import Playlists from '~/stores/playlists';
import User from '~/stores/user';

export default class Sidebar extends Vue {
    user!: User;
    breadcrumbs!: BreadCrumbs;
    RC = useRuntimeConfig();
    options: { name: string, icon: string[], click: any }[] = []
    playlists!: Playlists;

    async created() {
        if (!process.client) return;

        this.user = new User();
        this.breadcrumbs = new BreadCrumbs();
        this.playlists = new Playlists();
        const code = this.$route.query?.code;

        // If there is a code in the url, ask our server for tokens
        if (code){
            window.history.pushState({}, document.title, "/");

            // Request tokens
            const error = await this.user.getTokens(
                this.RC.public.SP_CLIENT_ID,
                code as string
            );

            if (!error)
                this.user.finishLogin();
        }
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