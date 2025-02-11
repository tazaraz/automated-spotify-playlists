<template>
    <div v-if="!src" class="image d-flex align-items-center justify-content-center">
        <span class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
        </span>
    </div>
    <span v-else-if="Array.isArray(src)" class="image d-flex align-items-center justify-content-center">
        <fa-icon :icon="src"></fa-icon>
    </span>
    <img v-else-if="!error" class="image object-fit-cover" :src="src" @error="error = true"/>
    <span v-else-if="error" class="image d-flex align-items-center justify-content-center">
        <fa-icon :icon="['fas', 'question']"></fa-icon>
    </span>
</template>

<script lang="ts">
import { Vue, Component, toNative, Prop } from  'vue-facing-decorator';

/**
 * This component is used to display an image with a fallback icon if the image fails to load.
 */
@Component({})
class Image extends Vue {
    @Prop({ required: true })
    src!: string | [string, string];

    error = false;
}

export default toNative(Image);
</script>

<style lang="scss" scoped>
.image {
    aspect-ratio: 1 / 1;
    border: none;
}
</style>