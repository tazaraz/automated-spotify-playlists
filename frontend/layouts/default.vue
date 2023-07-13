<template>
    <Html data-bs-theme="dark"></Html>
    <main v-if="layout" class="bg-black overflow-hidden" ref="wrapper"
        @touchend="layout.setDragging('sidebar', false); layout.setDragging('edit', false)"
        @touchmove="layout.resize($event)"
        @mouseup="layout.setDragging('sidebar', false); layout.setDragging('edit', false)"
        @mousemove="layout.resize($event)">
        <div v-if="layout.app.width > 0 && layout.app.width < layout.app.mobile" class="offcanvas offcanvas-start bg-black d-sm-flex w-100 p-3"
            tabindex="-1" id="sidebar">
            <Sidebar></Sidebar>
        </div>
        <template v-else>
            <Sidebar></Sidebar>
            <span class="resize-handle d-sm-flex d-none" style="grid-row: span 2; grid-column: span 1"
                @touchstart="layout.setDragging('sidebar', true)"
                @mousedown="layout.setDragging('sidebar', true)"><i class="rounded-5"></i></span>
        </template>

        <toolbar />
        <slot v-if="user && user.info" open></slot>

        <article v-else class="rounded-2 p-2 bg-dark-subtle overflow-hidden">
            <Title>Smart playlists</Title>
            <h2>Please log in first</h2>
        </article>

        <template v-if="user && user.info && playlists && playlists.editing">
            <div v-if="layout.app.width > 0 && layout.app.width < layout.app.mobile" class="offcanvas offcanvas-end bg-black d-sm-flex w-100 p-3"
                tabindex="-1" id="edit">
                <Edit @open="layout.open('edit')" />
            </div>
            <template v-else>
                <span class="resize-handle d-sm-flex d-none" style="grid-row: span 2; grid-column: span 1"
                    @touchstart="layout.setDragging('edit', true)"
                    @mousedown="layout.setDragging('edit', true)"><i class="rounded-5"></i></span>
                <Edit @open="layout.open('edit')" />
            </template>
        </template>
    </main>
</template>

<script lang="ts">
import { Offcanvas } from 'bootstrap';
import { Vue } from 'vue-property-decorator';
import BreadCrumbs from '~/stores/breadcrumbs';
import Layout from '~/stores/layout';
import Playlists from '~/stores/playlists';
import User from '~/stores/user';

export default class App extends Vue {
    user!: User;
    playlists!: Playlists;
    layout!: Layout;

    offcanvas!: Offcanvas[];

    async created() {
        if (!process.client) return;
        this.user = new User()
        this.user.loadCredentials();
        this.playlists = new Playlists();
        this.layout = new Layout();

        // If the unpublished playlist is not populated, but the url contains 'unpublished', redirect
        if (this.$route.fullPath.includes('unpublished') && !this.playlists.unpublished)
            await navigateTo('/');

        // If the user is not logged in, don't load the playlists
        if (!this.user.info)
            return (new BreadCrumbs()).clear();

        this.playlists.setUser(this.user)
        await this.playlists.loadUserPlaylists();
    }

    mounted() {
        this.layout.nextTick = this.$nextTick;
        this.layout.appElement = this.$refs.wrapper as HTMLElement;
        this.layout.mainElement = this.layout.appElement.getElementsByTagName('article')[0] as HTMLElement;
        this.layout.app.width = this.layout.appElement.clientWidth;
        this.layout.playlistEditing = this.playlists.editing == null;

        const offcanvasElementList = document.querySelectorAll('.offcanvas')
        this.offcanvas = [...offcanvasElementList].map(offcanvasEl => new this.$bootstrap.Offcanvas(offcanvasEl))

        /** When the basic stuff is loaded */
        watch(() => [this.user.info, this.playlists?.storage], () => {
            this.layout.resize(null, true)
        })

        /** Watch the url */
        watch(() => this.$route.fullPath, async () => {
            /** When the url changes, the info view changes. Update it */
            await this.$nextTick();
            this.layout.mainElement = this.layout.appElement.getElementsByTagName('article')[0] as HTMLElement;
            this.layout.resize(null, true);
        })

        /** When we start/stop editing */
        watch(() => this.playlists?.editing, async () => {
            this.layout.resize(null, true);
        })

        /** When the user resizes the window */
        addEventListener("resize", () => {
            this.layout.app.width = this.layout.appElement.clientWidth;
            this.layout.resize(null, true)
        })
    }
}
</script>
<style lang="scss">
* {
    scrollbar-color: grey transparent;

    ::-webkit-scrollbar {
        width: 0.6em;
        background: rgba(0, 0, 0, 0);
    }

    ::-webkit-scrollbar-thumb {
        background: grey;
        border-radius: 3rem
    }

    ::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0);
    }
}
</style>
<style lang="scss" scoped>
/** Width of the handle used to resize content. FIXED IN JAVASCRIPT ABOVE (layout.handle) */
$handle: 12px;
/** This is hardcoded in the javascript above! (search for '2*16' (padding on both sides)) */
$app_padding: 1rem;

.resize-handle {
    width: $handle;
    padding: 0 4px;
    align-items: center;
    cursor: col-resize;

    i {
        display: block;
        height: 6rem;
        width: 100%;
        background-color: $gray-600;
    }
}

main {
    display: grid;
    grid-template-columns: 20rem $handle 1fr 0px 0px;
    grid-template-rows: 4rem 1fr;
    width: 100vw;
    height: 100%;
    position: fixed;
    padding: $app_padding;

    nav {
        grid-row: span 2;
    }

    &:deep(#toolbelt) {
        grid-row: span 1;
        grid-column: span 3 !important;
    }

    // This splits the app content into two columns if there are two components present
    &:deep(#toolbelt)+* {
        grid-column: span 3;
    }

    &> :nth-last-child(3) {
        grid-column: span 1 !important;
    }
}

@include media-breakpoint-down(sm) {
    main {
        grid-template-columns: 1fr;
        grid-template-rows: 4rem calc(100% - 4rem);

        nav {
            grid-row-start: 2;
            grid-row-end: 3;
        }

        &:deep(#toolbelt) {
            grid-row: span 1;
        }
    }
}</style>
