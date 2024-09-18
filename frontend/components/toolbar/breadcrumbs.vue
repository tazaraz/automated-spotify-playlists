<template>
    <ol v-if="breadcrumbs && breadcrumbs.history" class="breadcrumb flex-fill flex-nowrap vertical-align-center p-2 m-auto w-0 text-truncate">
        <li v-for="(item, index) of breadcrumbs.history"
            :key="index"
            style="min-width: 0rem; max-width: 10rem"
            :class="`breadcrumb-item text-truncate${index == breadcrumbs.history.length - 1 ? ' active' : ''}`">
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
import Layout from '~/stores/layout';

export default class Breadcrumbs extends Vue {
    breadcrumbs: BreadCrumbs = null as any;

    async created() {
        if (!process.client) return;
        this.breadcrumbs = new BreadCrumbs();
        this.breadcrumbs.layout = new Layout();

        const router = useRouter();
        router.beforeEach((to, from, next) => {
            /** Find the index of the item we are going to */
            const index = this.breadcrumbs.history.findIndex(item => item.to == to.fullPath);

            /** If this item does not yet exist, we store the scroll position of the current page */
            if (index < 0 && this.breadcrumbs.history.length > 0) {
                // Get the main element scroll item
                const scroll = document.getElementsByTagName('main')[0]?.children[0]?.children[1]?.scrollTop;
                this.breadcrumbs.history[this.breadcrumbs.history.length - 1].scroll = scroll;
            }

            next();
        })
    }
}
</script>