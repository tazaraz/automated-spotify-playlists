<template>
    <Playlist></Playlist>
</template>

<script lang="ts">
import { Vue, Component, toNative } from 'vue-facing-decorator';

@Component({})
class PlaylistWrapper extends Vue {
}

export default toNative(PlaylistWrapper);
</script>
