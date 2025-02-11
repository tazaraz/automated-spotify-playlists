<template>
    <div class="tool-tip">
        <slot></slot>
        <span ref="info" data-bs-toggle="ToolTip" data-bs-delay='{"show":750,"hide":0}' :data-bs-title="description"
            @click="clicked" v-click-outside="hide">
            <fa-icon :icon="['far', 'circle-question']"></fa-icon>
        </span>
    </div>
</template>

<script lang="ts">
import { Tooltip } from 'bootstrap';
import { Vue, Component, toNative, Prop } from 'vue-facing-decorator';

/**
 * An easy wrapper for the bootstrap ToolTip
 */
@Component({})
class ToolTip extends Vue {
    @Prop({ required: true }) description!: string
    ToolTip: Tooltip = null as any;

    mounted() {
        this.ToolTip = new this.$bootstrap.Tooltip(this.$refs.info as HTMLElement);
    }

    updated() {
        this.ToolTip.setContent({".ToolTip-inner": this.description});
    }

    beforeUnmount() {
        this.hide();
        this.ToolTip.dispose();
    }

    hide() {
        (this.$refs.info as HTMLElement).classList.remove('active');
        this.ToolTip.hide();
    }

    clicked() {
        (this.$refs.info as HTMLElement).classList.contains('active') ?
            this.ToolTip.hide() :
            this.ToolTip.show();
        (this.$refs.info as HTMLElement).classList.toggle('active');
    }
}

export default toNative(ToolTip);
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

        &:hover {
            color: $gray-300;
        }

        * {
            margin: auto;
        }
    }
}
</style>
