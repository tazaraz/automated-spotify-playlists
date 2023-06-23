<template>

</template>

<script lang="ts">
import { Vue, Prop } from 'vue-property-decorator';

enum inputTypes {
    // value is the default input type, and is used for most filters
    value,
    // date acts the same as value, exept the <input> has limitations on its input
    date,
    // slider is used for inputs which can only range from 0 to 100
    slider,
    // boolean can only be true or false, and is saved in the `condition.operation` instead of `condition.value`
    boolean
}

export default class EditCondition extends Vue {
    @Prop({required: true}) condition!: PlaylistCondition
    @Prop({required: true}) indent!: number


}
</script>

<style lang="scss" scoped>

</style>