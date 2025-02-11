<template>
    <div class="spotify-ref d-flex">
        <Image :src="large ? '/spotify-logo-small.svg' : '/spotify-logo.svg'"></Image>
        <url :to="`${to}`" :direct="true" target="_blank" class="d-flex m-auto ms-3 me-0">
            <slot></slot>
        </url>
    </div>
</template>

<script lang="ts">
import { Vue, Component, toNative, Prop } from  'vue-facing-decorator';

@Component({})
class SpotifyLink extends Vue {
    @Prop({default: true}) large!: boolean;
    @Prop({default: ""}) to!: string;
}

export default toNative(SpotifyLink);
</script>

<style lang="scss" scoped>
.spotify-ref {
    img {
        height: 2.5rem;
    }
    :deep(a) {
        color: #1DB954;
    }
}
</style>