<template>
    <button @click="openModal" :class="`${buttonClass} border-0`">
        <fa-icon v-if="buttonIcon" :icon="buttonIcon"></fa-icon>
        {{ buttonText }}
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
import { Vue, Component, toNative, Prop, Emit } from  'vue-facing-decorator';

/**
 * An easy wrapper for the bootstrap model
 */
@Component({})
class Modal extends Vue {
    @Prop({ default: null }) buttonText!: string;
    @Prop({ default: null }) buttonIcon!: [string, string];
    @Prop({ default: "" }) buttonClass!: string;

    id = Math.random().toString(36).substring(2, 15);
    modal: bsModal = null as any;

    @Emit('open')
    openModal() {
        const modalElement = document.getElementById(`modal-${this.id}`)!;

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

export default toNative(Modal);
</script>