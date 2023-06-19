<template>
    <nav id="toolbelt" class="d-flex rounded-3 mb-2 bg-dark-subtle">
        <ClientOnly>
            <Breadcrumbs class="ms-3" />
            <ul class="nav nav-pills align-self-end m-auto">
                <li v-if="user && user.info" class="nav-item cursor-pointer">
                    <url class="nav-link pe-0" @click="user.logout()">
                        <span class="me-1">{{ user.info.name }}</span>
                        <i><fa-icon :icon="['fas', 'user']" style="width:2rem; padding-right: .5rem;"></fa-icon></i>
                    </url>
                </li>
                <li v-else class="nav-item cursor-pointer">
                    <url class="nav-link pe-0" @click="user?.login">
                        <span class="me-1">Log in</span>
                        <i><fa-icon :icon="['fas', 'user']" style="width:2rem; padding-right: .5rem;"></fa-icon></i>
                    </url>
                </li>
            </ul>
        </ClientOnly>
    </nav>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import BreadCrumbs from '~/stores/breadcrumbs';
import User from '~/stores/user';

export default class Sidebar extends Vue {
    user!: User;
    breadcrumbs!: BreadCrumbs;
    RC = useRuntimeConfig();
    options: { name: string, icon: string[], click: any }[] = []

    async created() {
        if (!process.client) return;

        this.user = new User();
        this.breadcrumbs = new BreadCrumbs();
        this.user.loadCredentials();
        const code = this.$route.query?.code;

        // If there is a code in the url, ask our server for tokens
        if (code){
            window.history.pushState({}, document.title, "/");

            // Request tokens
            const error = await this.user.getTokens(
                this.RC.public.SP_CLIENT_ID,
                code as string
            );

            if (!error) {
                navigateTo(localStorage.getItem("origin") || "/");
                localStorage.removeItem("origin");
            }
        }
    }
}
</script>

<style lang="scss" scoped>
#toolbelt {
    a {
        cursor: pointer;
    }
}
</style>