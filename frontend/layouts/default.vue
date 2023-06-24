<template>
    <Html data-bs-theme="dark"></Html>
    <main class="p-3 bg-black overflow-hidden" ref="main">
        <div class="offcanvas offcanvas-start bg-black d-sm-flex w-100 p-3" tabindex="-1" id="sidebar">
            <sidebar />
        </div>
        <sidebar class="d-sm-flex d-none" />

        <toolbar />

        <template v-if="user && user.loggedIn()">
            <slot></slot>
        </template>
        <article v-else class="rounded-2 p-2 bg-dark-subtle overflow-hidden">
            <Title>Smart playlists</Title>
            <h2>Please log in first</h2>
        </article>
        <Edit v-if="playlists && playlists.editing"></Edit>
    </main>
</template>

<script lang="ts">
import { Offcanvas } from 'bootstrap';
import { Vue } from 'vue-property-decorator';
import BreadCrumbs from '~/stores/breadcrumbs';
import Playlists from '~/stores/playlists';
import User from '~/stores/user';

export default class Sidebar extends Vue {
    user!: User;
    playlists!: Playlists;

    /**Breakpoints, for when the editor is visibile,
     * on how to treat the playlist, album, etc. view ('mobile-like' or normal) */
    breakpoints = { min: 1200, max: 1550 };
    breakpointOverrides!: NodeListOf<Element>;
    offcanvas!: Offcanvas[];

    async created() {
        if (!process.client) return;
        this.user = new User()
        this.user.loadCredentials();

        if (!this.user.loggedIn())
            return (new BreadCrumbs()).clear();

        this.playlists = new Playlists();
        this.playlists.setUser(this.user)
        await this.playlists.loadUserPlaylists();
    }

    mounted() {
        if (!process.client) return; if (!this.user.loggedIn()) return (new BreadCrumbs()).clear();

        const offcanvasElementList = document.querySelectorAll('.offcanvas')
        this.offcanvas = [...offcanvasElementList].map(offcanvasEl => new this.$bootstrap.Offcanvas(offcanvasEl))

        watch(() => this.$route.fullPath, () => this.onUpdate())
        watch(() => this.playlists.editing, () => this.onUpdate())
        addEventListener("resize", () => this.onUpdate())
        this.onUpdate();
    }

    onUpdate() {
        // Wait for the next tick, so the DOM is updated
        this.$nextTick(() => {
            // Close all offcanvas
            for (const offcanvas of this.offcanvas) {
                offcanvas.hide();
            }

            this.breakpointOverrides = document.querySelectorAll("[data-editing-class]")

            for (const element of this.breakpointOverrides) {
                const classes = element.getAttribute("data-editing-class")?.split(" ") ?? [];
                for (const className of classes) {
                    // If we should replace the breakpoint with a lower one
                    if (this.playlists.editing &&
                        this.breakpoints.min <= window.innerWidth && window.innerWidth <= this.breakpoints.max) {
                        // Remove the breakpoint class
                        element.classList.remove(className);
                    } else {
                        // Add the breakpoint class
                        element.classList.add(className);
                    }
                }
            }
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
main {
    display: grid;
    grid-template-columns: minmax(20rem, 25rem) minmax(23rem, 70vw) minmax(25rem, 34rem);
    grid-template-rows: 4rem 1fr;
    height: 100vh;
    width: 100vw;

    nav {
        grid-row: span 2;
    }

    &:deep(#toolbelt) {
        grid-row: span 1;
        grid-column: span 2 !important;
    }

    // This splits the main content into two columns if there are two components present
    &:deep(#toolbelt)+* {
        grid-column: span 2;
    }

    &> :nth-last-child(2) {
        grid-column: span 1 !important;
    }
}

@include media-breakpoint-down(xl) {
    main {
        grid-template-columns: 20rem 1fr;
        grid-template-rows: 4rem 1fr 1fr;

        nav {
            grid-column: span 1;
            grid-row: span 3;
        }

        &:deep(#toolbelt) {
            grid-row: span 1;
            grid-column: span 1 !important;
        }

        &:deep(#toolbelt)+* {
            grid-column: span 1;
            grid-row: span 2;
        }

        &> :nth-last-child(2):not(nav) {
            grid-row: span 1 !important;
        }
    }
}

@include media-breakpoint-down(md) {
    main {
        grid-template-columns: 6.5rem 1fr;
        grid-template-rows: 4rem 1fr 1fr;

        nav {
            grid-column: span 1;
            grid-row: span 3;
        }

        &:deep(#toolbelt) {
            grid-row: span 1;
            grid-column: span 1 !important;
        }

        &:deep(#toolbelt)+* {
            grid-column: span 1;
            grid-row: span 2;
        }

        &> :nth-last-child(2):not(nav) {
            grid-row: span 1 !important;
        }
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
