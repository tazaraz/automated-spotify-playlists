<template>
    <span @touchstart="grabbed = true" @mousedown="grabbed = true"
          class="resize-handle d-sm-flex d-none" :style="`width: ${layout.app.handleWidth}px;`">
          <i class="rounded-5"></i></span>
</template>

<script lang="ts">
import { Component, Vue, toNative, Prop } from 'vue-facing-decorator';
import Layout from '@/stores/layout';

@Component({})
class UIHandle extends Vue {
    @Prop({required: true})
    view!: 'editor' | 'sidebar';

    grabbed = false;
    layout: Layout = null as any;

    beforeMount() {
        this.layout = new Layout();
        document.addEventListener('mousemove', this.move);
        document.addEventListener('touchmove', this.move);
        document.addEventListener('mouseup', () => this.grabbed = false);
        document.addEventListener('touchend', () => this.grabbed = false);
    }

    move(event: MouseEvent | TouchEvent) {
        if (!this.grabbed) return;
        this.layout.resize(this.view, event);
    }
}

export default toNative(UIHandle);
</script>

<style lang="scss" scoped>
.resize-handle {
    width: 12px;
    padding: 0 4px;
    align-items: center;
    cursor: col-resize;
    grid-row: span 3;
    grid-column: span 1;

    i {
        display: block;
        height: 6rem;
        width: 100%;
        background-color: $gray-600;
    }
}
</style>