<template>
    <div class="tool-tip">
        <slot></slot>
        <span ref="info" data-bs-toggle="InfoTooltip" data-bs-delay='{"show":750,"hide":0}' :data-bs-title="description"
            @click="clicked" v-click-outside="hide">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke="currentColor" stroke-width="3"
                    d="M12,22 C17.5228475,22 22,17.5228475 22,12 C22,6.4771525 17.5228475,2 12,2 C6.4771525,2 2,6.4771525 2,12 C2,17.5228475 6.4771525,22 12,22 Z M12,15 L12,14 C12,13 12,12.5 13,12 C14,11.5 15,11 15,9.5 C15,8.5 14,7 12,7 C10,7 9,8.26413718 9,10 M12,16 L12,18" />
            </svg>
        </span>
    </div>
</template>

<script lang="ts">
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
