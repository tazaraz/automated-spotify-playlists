<template>
    <button :style="`${buttonStyle}`" @click="openModal" class="d-flex border-0 bg-transparent p-2">
        {{ title }}
        <fa-icon v-if="button" :icon="button"></fa-icon>
    </button>
    <div class="modal fade" :id="`modal-${id}`" tabindex="-1">
        <div class="modal-dialog">
            <div class="modal-content">
                <slot></slot>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Modal as bsModal } from 'bootstrap';
import { Prop, Vue } from  'vue-property-decorator';

export default class Modal extends Vue {
    @Prop({ default: null }) title!: string;
    @Prop({ default: null }) button!: [string, string];
    @Prop({ default: null }) buttonStyle!: string;

    id = Math.random().toString(36).substring(2, 15);
    modal!: bsModal

    openModal() {
        const modalElement = document.getElementById(`modal-${this.id}`);

        // If the element is already present in the body, don't append it again
        if (modalElement?.parentElement == document.body) {
            this.modal.show();
            return;
        };

        document.body.append(modalElement)

        this.modal = new this.$bootstrap.Modal(document.getElementById(`modal-${this.id}`)!, {
            keyboard: false
        });

        this.modal.show();
    }

    unmount() {
        const modalElement = document.getElementById(`modal-${this.id}`);
        if (modalElement) modalElement.remove();
        this.modal.dispose();
    }
}
</script>