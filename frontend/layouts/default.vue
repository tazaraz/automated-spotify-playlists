<template>
    <Html data-bs-theme="dark"></Html>
    <main class="p-3 bg-black overflow-hidden" ref="main">
        <sidebar />
        <toolbar />
        <template v-if="user && user.loggedIn()">
            <slot></slot>

        </template>
        <article v-else class="rounded-2 p-2 bg-dark-subtle overflow-hidden">
            <Title>Smart playlists</Title>
        </article>
    </main>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import User from '~/stores/user';

export default class Sidebar extends Vue {
    user!: User;

    created() {
        if (!process.client) return;
        this.user = new User()
        this.user.loadCredentials();
    }
}
</script>
<style lang="scss">
* {
    scrollbar-color: grey rgba(0, 0, 0, 0);

    ::-webkit-scrollbar {
        width: 0.6em;
        background:  rgba(0,0,0,0);
    }
    ::-webkit-scrollbar-thumb {
        background: grey;
        border-radius: 3rem
    }

    ::-webkit-scrollbar-track{
       background: rgba(0,0,0,0);
    }
}
</style>
<style lang="scss" scoped>
main {
    display: grid;
    grid-template-columns: minmax(310px, 400px) minmax(380px, 70vw) minmax(400px, 550px);
    grid-template-rows: 60px 1fr;
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
    &:deep(#toolbelt) + * { grid-column: span 2; }
    & > :nth-last-child(2) { grid-column: span 1 !important;}
}

@include media-breakpoint-down(xl) {
    main {
        grid-template-columns: 320px 1fr;
        grid-template-rows: 60px 1fr 1fr;

        nav {
            grid-column: span 1;
            grid-row: span 3;
        }

        &:deep(#toolbelt) {
            grid-row: span 1;
            grid-column: span 1 !important;
        }

        &:deep(#toolbelt) + * { grid-column: span 1; grid-row: span 2; }
        & > :nth-last-child(2) { grid-row: span 1 !important;}
    }
}
</style>
