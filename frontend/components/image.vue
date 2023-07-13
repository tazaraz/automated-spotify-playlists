<template>
    <div v-if="!src" class="image bg-transparent d-flex align-items-center justify-content-center">
        <span class="d-block loading-icon" style="box-shadow: none"></span>
    </div>
    <span v-else-if="!src.image" class="image d-flex align-items-center justify-content-center" style="aspect-ratio: 1;">
        <i><fa-icon :icon="['fas', 'question']"></fa-icon></i>
    </span>
    <img v-else class="image object-fit-cover" :src="src.image"/>
</template>


<script lang="ts">
import { Prop, Vue } from  'vue-property-decorator';

export default class Image extends Vue {
    @Prop({ required: true }) src!: { image: string };
}
</script>