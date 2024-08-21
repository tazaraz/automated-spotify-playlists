<template>
    <div class="tool-tip">
        <slot></slot>
        <span ref="info" data-bs-toggle="InfoTooltip" data-bs-delay='{"show":750,"hide":0}' :data-bs-title="description"
            @click="clicked" v-click-outside="hide">
            <fa-icon :icon="['far', 'circle-question']"></fa-icon>
        </span>
    </div>
</template>

<script lang="ts">
import { icon } from '@fortawesome/fontawesome-svg-core';
import { Tooltip } from 'bootstrap';
import { Vue, Prop } from 'vue-property-decorator';

/**
 * An easy wrapper for the bootstrap InfoTooltip
 */
export default class InfoTooltip extends Vue {
    @Prop({ required: true }) description!: string
    InfoTooltip: Tooltip = null as any;

    mounted() {
        this.InfoTooltip = new this.$bootstrap.Tooltip(this.$refs.info as HTMLElement);
    }

    updated() {
        this.InfoTooltip.setContent({".InfoTooltip-inner": this.description});
    }

    beforeUnmount() {
        this.hide();
        this.InfoTooltip.dispose();
    }

    hide() {
        this.$refs.info.classList.remove('active');
        this.InfoTooltip.hide();
    }

    clicked() {
        this.$refs.info.classList.contains('active') ?
            this.InfoTooltip.hide() :
            this.InfoTooltip.show();
        this.$refs.info.classList.toggle('active');
    }
}
</script>

<style lang="scss" scoped>
.tool-tip {
    display: flex;
    gap: 0.25rem;
    align-items: center;

    // The info icon
    &> :last-child {
        display: flex;
        margin: auto 0;
        width: 0.85rem;
        height: 0.85rem;
        flex: inherit;

        color: $gray-500;
        cursor: pointer;

        &.active,
        &:hover {
            color: $gray-300;
        }

        * {
            margin: auto;
        }
    }
}
</style>
