<template>
    <ol v-if="breadcrumbs && breadcrumbs.history" class="breadcrumb p-2 m-auto me-3 flex-fill vertical-align-center">
        <template v-if="breadcrumbs.show">
            <li v-for="(item, index) of breadcrumbs.history"
                :key="index"
                :class="`breadcrumb-item${index == breadcrumbs.history.length - 1 ? ' active' : ''}`"
            ><url :to="item.to">{{ item.name }}</url></li>
        </template>
    </ol>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import BreadCrumbs from '~/stores/breadcrumbs';
import Info from '~/stores/info';
import PlaylistStore from '~/stores/playlists';
import User from '~/stores/user';


export default class Breadcrumbs extends Vue {
    playlistStore!: PlaylistStore
    breadcrumbs!: BreadCrumbs;
    info!: Info;
    RC = useRuntimeConfig();

    async created() {
        if (!process.client) return;
        this.breadcrumbs = new BreadCrumbs();
        this.playlistStore = new PlaylistStore(new User());
        this.info = new Info();

        const route = useRoute();
        watch(() => route.fullPath, () => this.$nextTick(() => {
            console.log("redirect to:", route.fullPath, this.playlistStore.selectedPlaylist?.name, this.info.currentItem?.name)
            if (route.fullPath.startsWith('/playlist'))
                this.breadcrumbs.goto(route.fullPath, this.playlistStore.selectedPlaylist?.name)
            else if (route.fullPath.startsWith("/info"))
                this.breadcrumbs.goto(route.fullPath, this.info.currentItem?.name)
        }), {deep: true, immediate: true})
    }
}
</script>

<style lang="scss" scoped>
nav {
    a {
        cursor: pointer;
    }
}
</style>