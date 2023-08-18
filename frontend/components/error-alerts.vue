<template>
    <template v-for="error of errors">
        <article class="alert alert-info m-4 mt-2" role="alert">
            <template v-if="error.status == 401">
                <h5 class="alert-heading">Unauthorized</h5>
                <span>{{ error.message }}</span>
            </template>
            <template v-else-if="error.status == 429">
                <h5 class="alert-heading">Too many requests</h5>
                <span>{{ error.message }}</span>
            </template>
            <template v-else>
                <h5 class="alert-heading">Error {{ error.status }}</h5>
                <span>{{ error.message }}</span>
            </template>
        </article>
    </template>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';
import FetchError from '~/stores/error';

export default class ErrorAlerts extends Vue {
    errors = null as unknown as typeof FetchError.errors;

    beforeMount() {
        FetchError.handler = () => {
            this.errors = FetchError.errors;
            this.$forceUpdate();
        }
    }
}
</script>

<style lang="scss" scoped>
main {
    margin-top: 64px;
}
</style>
