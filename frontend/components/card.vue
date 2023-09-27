<template>
    <url :to="card.url" class="w-25 mb-3">
        <div class="card h-100 p-3 border-0">
            <Image :src="card" class="rounded-2" :fallback="fallback" />
            <div class="card-body d-flex flex-column pt-3 p-0">
                <h6 class="card-title d-block text-truncate">{{ card.title }}</h6>
                <slot></slot>
            </div>
        </div>
    </url>
</template>

<script lang="ts">
import { Prop, Vue } from 'vue-property-decorator';

interface Card {
    title: string;
    url: string;
    image: string;
}

/**
 * This component is used to display a card with an image, title and description.
 * Used in the info pages.
 */
export default class InfoCard extends Vue {
@Prop({ required: true }) card!: Card;
    @Prop({ default: ['fas', 'question']}) fallback!: [string, string];
}
</script>

<style lang="scss" scoped>
a {
    max-width: 12rem;
    min-width: 9rem;
    .card {
        transition: all 0.2s ease-in-out;

        &:hover {
            background: $gray-800;
        }
    }
}
</style>