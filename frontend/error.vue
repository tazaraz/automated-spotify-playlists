<template>
    <nuxt-layout>
        <div>
            <article class="rounded-2 p-5 pt-4 bg-dark-subtle overflow-hidden">
                <template v-if="error.statusCode == 404">
                    <Title>I'm lost</Title>
                    <h2 class="mt-3 mb-4">Come again?</h2>
                    <span>Error 404. You've requested something which does not exist :/</span>
                </template>
                <template v-else-if="error.statusCode >= 500">
                    <Title>E.T. phone home</Title>
                    <h2>The server is experiencing some difficulties...</h2>
                    <span>{{ error.message }}</span>
                    <br><br>
                    <a :href="error.url || $router.options.history.state.current" class="btn border">Retry</a>
                    <br><br>
                    <span v-html="error.stack"></span>
                </template>
                {{ error.statusCode }}

            </article>
            <!-- <nuxt-page /> -->
        </div>
    </nuxt-layout>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import User from './stores/user';
import Playlists from './stores/playlists';
import Layout from './stores/layout';

export default class ErrorPage extends Vue {
    error = useError();
    user!: User;
    playlists!: Playlists;
    layout!: Layout;

    created() {
        if (!process.client) return;
        this.user = new User()
        this.user.loadCredentials();
        this.playlists = new Playlists();
        this.layout = new Layout();
    }
}
</script>

<style lang="scss" scoped>
main {
    margin-top: 64px;
}
</style>
