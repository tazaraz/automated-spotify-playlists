<template>
    <Title>ERROR</Title>
    <navbar></navbar>
    <main class="container p-3">
        <h2 class="mt-3 mb-4">{{ error.statusCode }}</h2>
        <div v-if="error.statusCode == 404">Oepsie whoopsie, this page cannot be found</div>
        <div v-if="error.statusCode > 500">The server is experiencing some difficulties...<br>{{ error.message }}</div>
    </main>
</template>

<script lang="ts">
import { Vue } from 'vue-property-decorator';

export default class ErrorPage extends Vue {
    error = useError();
}
</script>

<style lang="scss" scoped>
main {
    margin-top: 64px;
}
</style>
