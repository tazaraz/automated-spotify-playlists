<template>
    <div v-if="!source" class="image bg-transparent d-flex align-items-center justify-content-center">
        <span class="d-block loading-icon" style="box-shadow: none"></span>
    </div>
    <span v-else-if="!source.image" class="image d-flex align-items-center justify-content-center">
        <i><fa-icon :icon="['fas', 'question']"></fa-icon></i>
    </span>
    <img v-else class="image" :src="source.image"/>
</template>


<script lang="ts">
import { Prop, Vue } from  'vue-property-decorator';

export default class Image extends Vue {
    @Prop({ required: true }) source!: { image: string };
}
</script>