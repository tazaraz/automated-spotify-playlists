<template>
    <nuxt-link v-if="!direct && !externalUrl(to) && target === ''" :to="to">
        <slot></slot>
    </nuxt-link>
    <a v-else-if="target === ''" :href="to">
        <slot></slot>
    </a>
    <a v-else :href="to" :target="target">
        <slot></slot>
    </a>
</template>

<script lang="ts">
import { Prop, Vue } from  'vue-property-decorator';

export default class Url extends Vue {
    @Prop({default: ""}) to!: string;
    /* Sets the <a></a> target */
    @Prop({default: ""}) target!: string;
    /* Enforces the link to be an <a> tag */
    @Prop({default: false}) direct!: boolean;

    externalUrl(url: string){
        return url.match(/^(http(s)?|ftp):\/\//) !== null;
    }
}
</script>