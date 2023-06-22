<template>
    <ol v-if="breadcrumbs && breadcrumbs.history" class="breadcrumb flex-fill flex-nowrap vertical-align-center p-2 m-auto me-3 w-0">
        <li v-for="(item, index) of breadcrumbs.history"
            :key="index"
            style="min-width: 0rem; max-width: 10rem"
            :class="`breadcrumb-item text-truncate${index == breadcrumbs.history.length - 1 ? ' active' : ''}`"
        >
        <url v-if="index < breadcrumbs.history.length - 1" class="text-truncate" :to="item.to">{{ item.name }}</url>
        <template v-else>
            {{ item.name }}
        </template>
        </li>
    </ol>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import BreadCrumbs from '~/stores/breadcrumbs';
import Info from '~/stores/info';
import Playlists from '~/stores/playlists';
import User from '~/stores/user';


export default class Breadcrumbs extends Vue {
    playlists!: Playlists
    breadcrumbs!: BreadCrumbs;
    info!: Info;
    RC = useRuntimeConfig();

    async created() {
        if (!process.client) return;
        this.breadcrumbs = new BreadCrumbs();
        this.playlists = new Playlists();
        this.playlists.setUser(new User())
        this.info = new Info();

        const route = useRoute();
        watch(() => route.fullPath, () => this.$nextTick(() => {
            console.log("redirect to:", route.fullPath, this.playlists.editing?.name, this.info.currentItem?.name)
            if (route.fullPath.startsWith('/playlist'))
                this.breadcrumbs.add(route.fullPath, this.playlists.editing?.name)

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