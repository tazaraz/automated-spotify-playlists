<template>
    <Transition name="error" mode="out-in">
        <div v-if="layout.error[0]" id="alert" :class="`bg-dark-subtle ${layout.app.mobile?'mobile':'mb-2'}`">
            <div class="px-3 pb-2 pt-3">
                <h4>
                    <span v-if="layout.error[0].status >= 500"
                            class="bg-danger-subtle border-danger border rounded-3 px-2 py-1 me-2">
                            Error {{ layout.error[0].status }}
                    </span>
                    <span v-else-if="layout.error[0].status >= 400"
                            class="bg-info-subtle border-info border rounded-3 px-2 py-1 me-2">
                            Error {{ layout.error[0].status }}
                    </span>
                    <span v-else
                            class="bg-body-tertiary border-secondary border rounded-3 px-2 py-1 me-2">
                            Error {{ layout.error[0].status }}
                    </span>
                    {{ layout.error[0].title }}</h4>
                <div class="ms-2">{{ layout.error[0].message }}</div>
            </div>
            <hr v-if="layout.app.mobile" class="m-0"/>
        </div>
        <div id="alert" :class="layout.app.mobile?'mobile':''" v-else></div>
    </Transition>
</template>

<script lang="ts">
import { Component, Vue, toNative, Prop } from 'vue-facing-decorator';
import Layout from '@/stores/layout';

@Component({})
class UIAlert extends Vue {
    layout: Layout = null as any;

    created() {
        this.layout = new Layout();
    }
}

export default toNative(UIAlert);
</script>

<style lang="scss" scoped>
#alert.mobile {
    grid-column: span 2;
}
.error-enter-active,
.error-leave-active {
    transition: opacity 1s;
}

.error-enter-from,
.error-leave-to {
    opacity: 0;
}

.error-enter-to,
.error-leave-from {
    opacity: 1;
}
</style>