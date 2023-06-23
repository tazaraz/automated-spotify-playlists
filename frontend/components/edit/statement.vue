<template>

</template>

<script lang="ts">
import { Vue, Prop } from 'vue-property-decorator';

export default class EditStatement extends Vue {
    @Prop({required: true}) statement!: PlaylistStatement
    @Prop({required: true}) indent!: number
}
</script>

<style lang="scss" scoped>
</style>