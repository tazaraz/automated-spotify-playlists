<template>
    <nav id="sidebar" :class="`${offcanvas ? 'offcanvas offcanvas-start w-100':''} bg-black d-flex flex-column overflow-hidden h-100`">
        <div class="mb-2 p-3 rounded-3 bg-dark">
            <div class="d-flex">
                <url to="/" class="d-flex text-white w-100 justify-content-center" @click="hideOffcanvas()">
                    <h4 class="glex-grow-1 mb-0 mx-3">
                        <fa-icon :icon="['fas', 'gear']" style="height: 2rem"></fa-icon>
                    </h4>
                    <h3 class="tiny-d-none flex-grow-1 my-auto">Auto Playlists</h3>
                </url>
                <button v-if="offcanvas" class="p-2 btn-close ms-3 my-auto" @click="hideOffcanvas()"></button>
            </div>
            <hr>
            <ol class="mt-3 nav nav-pills flex-column">
                <li class="nav-item cursor-pointer">
                    <url :class="`d-flex nav-link px-0 justify-content-center${user?.info ? '' : ' disabled'}`"
                         to="/library" @click="hideOffcanvas()">
                        <h4 class="glex-grow-1 mb-0 mx-3">
                            <fa-icon :icon="['fas', 'heart']" style="height: 1.5rem"></fa-icon>
                        </h4>
                        <h4 class="tiny-d-none flex-grow-1">Library</h4>
                    </url>
                </li>
                <li class="nav-item cursor-pointer d-none d-sm-block">
                    <url :class="`d-flex nav-link px-0 justify-content-center${user?.info ? '' : ' disabled'}`"
                         to="/search" @click="hideOffcanvas()">
                        <h4 class="glex-grow-1 mb-0 mx-3">
                            <fa-icon :icon="['fas', 'search']" style="height: 1.5rem"></fa-icon>
                        </h4>
                        <h4 class="tiny-d-none flex-grow-1">Search</h4>
                    </url>
                </li>
                <li class="nav-item cursor-pointer d-block d-sm-none">
                    <div v-if="user && user.info" class="d-flex nav-link nav-item cursor-pointer dropdown px-0">
                        <div class="btn w-100 px-3" data-bs-toggle="dropdown">
                            <span class="d-flex">
                                <h4 class="glex-grow-1 mb-0 me-3">
                                    <fa-icon :icon="['fas', 'user']"></fa-icon>
                                </h4>
                                <h4 class="tiny-d-none flex-grow-1 text-start my-auto ms-1">{{ user.info.name }}</h4>
                            </span>
                        </div>
                        <ul class="dropdown-menu dropdown-menu-end py-1" style="z-index: 1030;">
                            <li @click="hideOffcanvas()">
                                <url :to="`/info/user/${user.info.id}`" class="dropdown-item">Profile</url>
                            </li @click="hideOffcanvas()">
                            <li>
                                <button class="dropdown-item" @click="logout">Log out</button>
                            </li>
                        </ul>
                    </div>
                    <div v-else>
                        <url to="." class="p-2" @click="user?.login">
                            <span class="me-3">Log in</span>
                            <i><fa-icon :icon="['far', 'user']"></fa-icon></i>
                        </url>
                    </div>
                </li>
            </ol>
        </div>
        <div class="rounded-3 bg-dark h-100 overflow-hidden py-3 px-2">
            <ol v-if="playlists?.storage" class="nav nav-pills d-block overflow-y-auto h-100">
                <div class="sidebar-header d-flex flex-row align-items-center gap-3 fs-6 p-2">
                    <h6 class="tiny-d-none d-flex lh-base flex-grow-1 mb-0">
                        Automated playlists
                    </h6>
                    <h6 class="tiny-d-flex d-none lh-base flex-grow-1 mb-0">
                        Auto playlists
                    </h6>
                    <button @click="addAutomatedPlaylist" class="btn tiny-d-none d-block rounded-3 text-white p-0 fs-5">
                        <i class="d-flex p-1" style="aspect-ratio: 1;">
                            <fa-icon class="my-auto" :icon="['fas', 'plus']" style="width:1.75rem"></fa-icon>
                        </i>
                    </button>
                </div>
                <li v-for="(playlist, index) in playlists.storage.filter(p => p.filters)" :key="index"
                    class="nav-item cursor-pointer">
                    <url :to="`/playlist/${playlist.id}`" @click="hideOffcanvas"
                         :class="`d-flex align-items-center nav-link p-2 ${playlist.id == playlists.loaded?.id ? 'bg-light-subtle':''}`">
                        <Image :src="playlist.image" class="tiny-auto-margin rounded-2 m-0"/>
                        <span class="tiny-d-none m-auto ms-3 text-truncate">{{ playlist.name }}</span>
                    </url>
                </li>
                <li v-if="playlists.storage?.filter(p => p.filters).length == 0"
                    class="tiny-d-none nav-item cursor-pointer">
                    <div class="nav-link bg-light-subtle p-3 me-2">
                        <span class="me-2 text-body-secondary">You don't have any automated playlists yet.</span>
                        <br><br>
                        <button @click="addAutomatedPlaylist"
                                class="btn d-flex align-items-center bg-white text-black ps-1 pb-1">
                            <i class="d-flex p-1" style="aspect-ratio: 1;">
                                <fa-icon :icon="['fas', 'plus']" class="my-auto" style="width:1.75rem;"></fa-icon>
                            </i>
                            Create one now
                        </button>
                    </div>
                </li>
                <li class="btn tiny-d-flex d-none nav-item cursor-pointer"
                    @click="addAutomatedPlaylist">
                    <Image class="btn border rounded-3 p-2 mx-auto" :src="['fas', 'plus']"/>
                </li>

                <h6 class="lh-base p-1 ps-2 pb-0 mt-4 mb-2">Normal playlists</h6>
                <li v-for="(playlist, index) in playlists.storage.filter(p => !p.filters)" :key="index"
                    class="nav-item cursor-pointer">
                    <url :to="`/playlist/${playlist.id}`" @click="hideOffcanvas"
                        :class="`d-flex nav-link rounded-2 p-2 ${playlist.id == playlists.loaded?.id ? 'bg-light-subtle':''}`">
                        <Image :src="playlist.image" class="tiny-auto-margin rounded-2 m-0" />
                        <span class="tiny-d-none m-auto ms-3 text-truncate">{{ playlist.name }}</span>
                    </url>
                </li>
                <li v-if="playlists.storage?.length == 0" class="nav-item cursor-pointer">
                    <div class="nav-link bg-light-subtle p-3 me-2">
                        <span class="me-2 text-body-secondary">You don't have any playlists! Create them in Spotify</span>
                    </div>
                </li>
            </ol>
            <ol v-else class="nav nav-pills overflow-y-auto h-100 d-block">
                <li class="nav-item cursor-pointer">
                    <div class="pt-3 pb-3 nav-link bg-light-subtle" data-sidebar-class="tiny-d-none normal-d-flex">
                        <span class="text-body">Once logged in, your playlists will appear here</span>
                        <br><br>
                        <button class="btn bg-white text-black" @click="user?.login()">Log in now</button>
                    </div>
                    <div class="p-0 pt-3 pb-3 nav-link d-none" data-sidebar-class="tiny-d-flex normal-d-none">
                        <button class="btn bg-white text-black mb-3" @click="user?.login()">Log in now</button>
                        <div class="rounded-1 p-2 bg-light-subtle text-body">Once logged in, your playlists will appear here</div>
                    </div>
                </li>
            </ol>
        </div>
    </nav>
</template>

<script lang="ts">
import { Offcanvas } from 'bootstrap';
import { Component, Vue, toNative, Prop } from 'vue-facing-decorator';
import Playlists from '~/stores/playlists';
import User from '@/stores/user';
import Editor from '~/stores/editor';

@Component({})
class Sidebar extends Vue {
    @Prop({default: 'normal'})
    size!: 'normal' | 'tiny';

    offcanvas: Offcanvas | null = null;
    user: User = null as any;
    playlists: Playlists = null as any;

    beforeMount() {
        this.user = new User();
        this.playlists = new Playlists();
    }

    async addAutomatedPlaylist() {
        this.playlists.addAutomatedPlaylist();
        await navigateTo('/playlist/unpublished');
        await this.playlists.loadUserPlaylistByID('unpublished');

        // Do not load the config if another is already loaded
        if (this.playlists.loaded.filters !== undefined &&
            this.playlists.loaded.ownership == 'user' &&
            this.playlists.editor == null) {
            // Open the editor
            new Editor().loadConfig(this.playlists.loaded);
        }

        this.hideOffcanvas();
    }

    async createOffcanvas() {
        if (!this.offcanvas) {
            // Ensure the element is rendered
            await this.$nextTick();
            this.offcanvas = new Offcanvas(document.getElementById('sidebar')!);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }

    async openOffcanvas() {
        await this.createOffcanvas();
        // Toggle the offcanvas
        this.offcanvas!.show();
    }

    hideOffcanvas() {
        this.offcanvas?.hide();
    }

    async unmountOffcanvas() {
        if (!this.offcanvas) return;
        this.offcanvas?.dispose();
        this.offcanvas = null;
    }
}

export default toNative(Sidebar);
</script>

<style lang="scss" scoped>
#sidebar {
    container-type: inline-size;
    container-name: sidebar;
}

@container sidebar (width: 7rem) {
    #sidebar:not(.offcanvas) {
        & > * {
            width: 7rem;
        }
        .sidebar-header {
            flex-direction: column;
        }

        .tiny-auto-margin { margin: auto !important; }
    }
}

.image {
    width: 3.75rem;
    height: 3.75rem;
    object-position: 50% 50%;
    object-fit: cover;
}
</style>