<template>
    test
</template>

<script lang="ts">
import { Vue, Prop } from 'vue-property-decorator';

interface SearchResult {
    id: string;
    name: string;
}

export default class EditStatement extends Vue {
    @Prop({required: true}) source!: PlaylistSource

}
</script>

<style lang="scss" scoped>
</style>