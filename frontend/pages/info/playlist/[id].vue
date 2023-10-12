<template>
    <playlist :id="$route.params.id"></playlist>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';

export default class PlaylistWrapper extends Vue {

}
</script>
