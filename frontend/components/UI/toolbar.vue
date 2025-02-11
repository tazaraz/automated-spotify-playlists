<template>
    <nav id="toolbar"
         :class="`d-flex gap-3 bg-dark justify-content-between align-items-center p-2 px-3 ${layout.app.mobile ? 'border-bottom' : 'mb-2'}`">
        <NowPlaying/>
        <div class="d-flex gap-3 justify-content-between flex-grow-1 mx-2">
            <button class="btn fs-3 d-sm-none p-1" @click="$emit('offcanvas', 'sidebar')">
                <!-- Library icon -->
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30" version="1.1">
                    <g transform="translate(0,-289.0625)">
                        <rect rx="2" ry="1.9999999" x="2" y="292.0625" width="3.5" height="24" style="fill:#ffffff"/>
                        <rect rx="2" ry="1.9999999" x="9" y="292.0625" width="3.5" height="24" style="fill:#ffffff"/>
                        <rect rx="2" ry="1.9999999" x="-86.261955" y="280.90771" width="3.5" height="24" style="fill:#ffffff"
                                transform="rotate(-20)"/>
                    </g>
                </svg>
            </button>

            <div class="nav-item">
                <url to="/search" class="btn d-sm-none d-flex h-100 p-2">
                    <i class="fs-5 m-auto"><fa-icon :icon="['fas', 'search']"></fa-icon></i>
                </url>
            </div>

            <div v-if="layout.editor.state !== 'none'" class="nav-item">
                <button id="open-editor"
                        class="btn btn-primary d-sm-none d-flex h-100 p-2"
                        @click="$emit('offcanvas', 'editor')">
                    <i class="fs-5 m-auto"><fa-icon :icon="['fas', 'wand-magic']"></fa-icon></i>
                </button>
            </div>

            <template v-if="!layout.app.mobile">
                <div v-if="user && user.info" class="nav-item cursor-pointer dropdown text-nowrap">
                    <button class="btn" data-bs-toggle="dropdown">
                        <span class="m-auto d-flex">
                            <span class="me-3">{{ user.info.name }}</span>
                            <fa-icon :icon="['fas', 'user']"></fa-icon>
                        </span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end py-1" style="z-index: 1030;">
                        <li>
                            <url :to="`/info/user/${user.info.id}`" class="dropdown-item">Profile</url>
                        </li>
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
            </template>
        </div>
    </nav>
</template>

<script lang="ts">
import { Vue, Component, toNative } from 'vue-facing-decorator';
import Playlists from '~/stores/playlists';
import Layout from '~/stores/layout';
import User from '~/stores/user';

@Component({})
class Toolbar extends Vue {
    playlists: Playlists = null as any;
    layout: Layout = null as any;
    user: User = null as any;

    created() {
        this.user = new User();
        this.playlists = new Playlists();
        this.layout = new Layout();
    }

    logout() {
        navigateTo('/');
        this.user.logout();
        this.playlists.editor = null as any;
        this.playlists.storage = null as any;
    }
}

export default toNative(Toolbar);
</script>

<style lang="scss" scoped>
#toolbar.small .btn {
    aspect-ratio: 1;
}
</style>

<style lang="scss" scoped>
.btn {
    line-height: 1;
}
#toolbar {
    box-shadow: 0 4px 20px #000c;
    z-index: 10;
}
</style>