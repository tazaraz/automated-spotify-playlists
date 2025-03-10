<template>
    <Html data-bs-theme="dark" class="bg-black"></Html>

    <Link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"></Link>
    <Link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"></Link>
    <Link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"></Link>
    <Link rel="manifest" href="/site.webmanifest"></Link>
    <Link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5"></Link>
    <Meta name="apple-mobile-web-app-title" content="Automated Playlists"></Meta>
    <Meta name="application-name" content="Automated Playlists"></Meta>
    <Meta name="msapplication-TileColor" content="#da532c"></Meta>
    <Meta name="apple-mobile-web-app-capable" content="yes"></Meta>
    <Meta name="theme-color" content="#0d6efd"></Meta>

    <Meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1"></Meta>

    <div v-if="layout" id="app" :class="`bg-black overflow-hidden${layout.app.mobile ? '':' rounded'}`" ref="app" :style="`padding: ${layout.app.padding}px; grid-template-columns: ${layout.app.grid.columns}; grid-template-rows: ${layout.app.grid.rows}`">
        <UISidebar :class="layout.sidebar.state" ref="sidebar"/>
        <UIHandle view="sidebar"/>

        <UIToolbar v-if="!layout.app.mobile" @offcanvas="openOffcanvas"/>

        <UIAlert />

        <main :class="`h-100 bg-dark overflow-hidden p-2 ${layout.main.state}`">
            <div class="h-100 d-flex flex-column overflow-y-auto placeholder-glow">
                <nuxt-page/>
            </div>
        </main>

        <template v-if="layout.editor.state !== 'none'">
        <UIHandle view="editor"/>
        <UIEditor ref="editor" :class="layout.editor.state"/>
        </template>

        <UIToolbar v-if="layout.app.mobile" @offcanvas="openOffcanvas" class="small" style="grid-column: span 2"/>
    </div>
</template>

<script lang="ts">
import { Component, Vue, toNative } from 'vue-facing-decorator';
import User from './stores/user';
import Playlists from './stores/playlists';
import Layout from './stores/layout';
import Editor from './stores/editor';
import Fetch from './composables/fetch';

@Component({})
class App extends Vue {
    user: User = null as any;
    playlists: Playlists = null as any;
    layout: Layout = null as any;
    editor: Editor = null as any;

    /**
     * Load everything once the app is created
     */
    async created() {
        this.user = new User();
        this.playlists = new Playlists();
        this.layout = new Layout();
        this.editor = new Editor();

        // Allow Fetch to create errors as well
        Fetch.createError = this.layout.createError;

        // Process the code grant if any
        if (this.$route.query?.code)
            await this.user.parseCodeGrant(this.$route.query.code as string);

        // If the user is logged in, load everything
        // Load credentials from local storage
        if (!this.user.loadCredentials()) {
            if (this.$route.fullPath !== '/')
                navigateTo('/');

            return;
        }

        // Setup the playlists store
        this.playlists.user = this.user;

        // If the user is logged in, load their playlists
        await this.playlists.loadUserPlaylists();
    }

    async mounted() {
        this.editor.playlists = this.playlists;
        this.editor.layout = this.layout;

        // Resolve conflicts on initial load and window resize
        this.layout.resolveConflicts();
        window.addEventListener('resize', () => {
            this.layout.resolveConflicts();
        });

        // Make the app mobile if the layout is set to mobile
        this.makeAppMobile(this.layout.app.mobile)
        watch(() => this.layout.app.mobile, () => this.makeAppMobile(this.layout.app.mobile));
    }

    makeAppMobile(state: boolean) {
        if (state) {
            this.$refs.sidebar!.createOffcanvas();
            this.$refs.editor?.createOffcanvas();
        } else {
            this.$refs.sidebar!.unmountOffcanvas();
            this.$refs.editor?.unmountOffcanvas();
        }
    }

    async openOffcanvas(kind: 'sidebar' | 'editor') {
        // Don't open any offcanvasses while not on mobile
        if (!this.layout.app.mobile)
            return;

        if (kind === 'sidebar') {
            await this.$refs.sidebar!.openOffcanvas();
        } else {
            await this.$refs.editor?.openOffcanvas();
        }
    }
}

export default toNative(App);
</script>

<style lang="scss" scoped>
#app {
    display: grid;
    width: 100vw;
    height: 100%;
    position: fixed;

    &:deep(#sidebar) {
        grid-row: span 3;
    }

    &:deep(#alerts) {
        grid-column: span 2;
    }

    &:deep(#toolbar) {
        grid-row: span 1;
        grid-column: span 3;
    }

    // This splits the app content into two columns if there are two components present
    &:deep(#toolbar)+* {
        grid-column: span 3;
    }

    & > :last-child:is(main) {
        grid-column: span 3;
    }

    &.rounded > * {
        border-radius: var(--bs-border-radius-lg);
    }
}

.resize-handle {
    padding: 0 4px;
    align-items: center;
    cursor: col-resize;
    grid-row: span 3;
    grid-column: span 1;

    i {
        display: block;
        height: 6rem;
        width: 100%;
        background-color: $gray-600;
    }
}
</style>

<style lang="scss">
main {
    container-type: inline-size;
    container-name: main;
}

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
