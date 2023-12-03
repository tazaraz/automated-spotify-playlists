<template>
    <div class="filter-item">
        <template v-for="i in indent">
            <span v-if="i > 1 && i < indent" class="tree indent"><i></i></span>
            <span v-if="i > 1 && i == indent" class="tree branch"><i></i><i></i></span>
            <span v-if="i == indent" :class="`d-flex align-items-center text-truncate ps-1 s${i - 1}`">
                If
                <select class="ms-3 me-3 form-select form-select-sm w-auto" @change="statementChange">
                    <option v-for="mode in Object.keys(FilterParserOptions)" :value="mode" :selected="statement.mode == mode">{{ mode }}</option>
                </select>
                <i></i>
                of the following are true:
            </span>
        </template>
        <button class="border-0 bg-transparent p-2" @click="$emit('event', 'add')">
            <fa-icon class="text-primary" :icon="['fas', 'plus']"></fa-icon>
        </button>
        <button v-if="indent < 3" class="border-0 bg-transparent p-2" @click="$emit('event', 'branch')">
            <fa-icon class="text-primary" :icon="['fas', 'code-branch']"></fa-icon>
        </button>
        <button class="border-0 bg-transparent p-2" @click="$emit('event', 'delete')">
            <fa-icon style="color: rgb(155, 0, 0)" :icon="['fas', 'trash-can']"></fa-icon>
        </button>
    </div>
</template>

<script lang="ts">
import { Emit, Vue, Prop } from 'vue-property-decorator';
import { PlaylistStatement } from '../../../backend/src/shared/types/playlist';
import { FilterParserOptions } from '../../../backend/src/shared/types/descriptions';

@Emit('change')
@Emit('event')
export default class EditStatement extends Vue {
    @Prop({required: true}) statement!: PlaylistStatement
    @Prop({required: true}) indent!: number

    FilterParserOptions = FilterParserOptions;

    /**
     * Used externally to check if all the required fields are filled
     */
    isValid() {
        return true;
    }

    statementChange(event: Event) {
        this.statement.mode = (event.target! as HTMLSelectElement).value as keyof typeof FilterParserOptions;
        this.$emit('change', this.statement)
    }
}
</script>

<style lang="scss" scoped>
.tree {
    margin: 0;

    &.indent i {
        height: 100%;
        width: calc(50% - 0.1rem);
        margin-left: calc(50% - 0.1rem);
        display: block;
        border-left: 0.15rem solid $gray-700;
    }

    &.branch i {
        height: 50%;
        width: calc(50% - 0.1rem);
        margin-left: calc(50% - 0.1rem);
        display: block;

        &:first-child {
            border-left: 0.15rem solid $gray-700;
            border-bottom: 0.15rem solid $gray-700;
        }
        &:last-child {
            border-left: 0.15rem solid $gray-700;
        }
    }
}

.s0 { grid-column: 1 / 9; }
.s1 { grid-column: 2 / 9; }
.s2 { grid-column: 3 / 10; }
</style>