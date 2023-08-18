<template>
    <div class="filter-item">
        <span class="grip"><fa-icon :icon="['fas', 'grip-vertical']"></fa-icon></span>
        <template v-for="i in indent">
            <span v-if="i < indent - 1" class="tree indent"><i></i></span>
            <span v-if="i == indent - 1" class="tree branch"><i></i><i></i></span>
            {{ condition.category }} - {{ condition.filter }}
            <span v-if="i == indent" :class="`center filter ps-1 f${i - 1}`">
                <select class="ms-2 form-select form-select-sm w-auto">
                    <option
                        v-for="category in Object.keys(MainFilters)"
                        :value="category"
                        :selected="condition.category == category">{{ category }}</option>
                </select>
                {{ SubFilters }} - {{ condition.filter }}
                <!-- <InfoField :description="SubFilters[condition.filter].description">
                    <select class="ms-2 form-select form-select-sm w-auto">
                        <option
                            v-for="filter in Object.keys(SubFilters)"
                            :value="filter"
                            :selected="condition.filter == filter">{{ filter }}</option>
                    </select>
                </InfoField> -->
                <i></i>
            </span>
        </template>

        <span class="center operation" data-edit-class="small-d-none">
            <InfoField :description="Operations[condition.operation]">
                <select class="form-select form-select-sm w-auto" @change="operationChange">
                    <option
                        v-for="op in Object.keys(Operations)"
                        :value="op"
                        :selected="condition.operation == op">{{ op }}</option>
                </select>
            </InfoField>
        </span>
        <span data-edit-class="small-d-block normal-d-none large-d-none" style="grid-column: span 2;"></span>

        <template v-if="layout && layout.edit.width >= layout.edit.large.min">
            <span v-if="inputType == inputTypes.value" class="center input input-group input-group-sm">
                <input type="text" class="source-input form-control" :value="condition.value"/>
            </span>
            <span v-if="inputType == inputTypes.date" class="center input input-group input-group-sm">
                <input type="date" class="source-input form-control" :value="condition.value"/>
            </span>
            <span v-if="inputType == inputTypes.time" class="center input duration">
                <div class="input-group input-group-sm">
                    <input @input="durationInput('minutes', $event)" type="number" class="source-input form-control" min="0" max="60" :value="duration[0]"/>
                    <span class="source-input form-control">:</span>
                    <input @input="durationInput('seconds', $event)" type="number" class="source-input form-control" min="0" max="60" :value="duration[1]"/>
                </div>
            </span>
            <span v-if="inputType == inputTypes.slider" class="center input input-group flex-column input-group-sm gap-3">
                <input @input="condition.value = $event.target!.value" type="range" class="source-input form-range m-auto" :value="condition.value"/>
                <span class="m-auto">{{ parseInt(condition.value) / 10 }} / 10</span>
            </span>
            <span v-if="inputType == inputTypes.boolean" style="grid-column: span 2;"></span>

            <span style="grid-column: span 2;"></span>
            <button class="border-0 bg-transparent" @click="$emit('event', 'delete')">
                <fa-icon style="color: rgb(155, 0, 0)" :icon="['fas', 'trash-can']"></fa-icon>
            </button>
        </template>

        <span style="grid-column: span 4;" data-edit-class="normal-d-block small-d-block large-d-none"></span>
        <button class="border-0 bg-transparent" data-edit-class="normal-d-block small-d-block large-d-none" @click="$emit('event', 'delete')">
            <fa-icon style="color: rgb(155, 0, 0)" :icon="['fas', 'trash-can']"></fa-icon>
        </button>

        <template v-for="i in indent"
            v-if="layout && layout.edit.width <= layout.edit.normal.min">
            <span v-if="i == 1"></span>
            <span v-if="i < indent" class="tree indent"><i></i></span>
            <template v-else>
                <span class="center stacked-operation">
                    <InfoField :description="Operations[condition.operation]">
                        <select class="form-select form-select-sm w-auto ms-4" @change="operationChange">
                            <option
                                v-for="op in Object.keys(Operations)"
                                :value="op"
                                :selected="condition.operation == op">{{ op }}</option>
                        </select>
                    </InfoField>
                </span>
            </template>
        </template>

        <template v-for="i in indent"
            v-if="layout && layout.edit.width < layout.edit.large.min &&
                inputType != inputTypes.boolean">
            <span v-if="i == 1"></span>
            <span v-if="i < indent" class="tree indent"><i></i></span>
            <template v-else>
                <span v-if="inputType == inputTypes.value" class="center stacked-input input-group input-group-sm ps-4">
                    <input type="text" class="source-input form-control" :value="condition.value"/>
                </span>
                <span v-if="inputType == inputTypes.date" class="center stacked-input input-group input-group-sm ps-4">
                    <input type="date" class="source-input form-control" :value="condition.value"/>
                </span>
                <span v-if="inputType == inputTypes.time" class="center stacked-input duration ps-4">
                    <div class="input-group input-group-sm">
                        <input @input="durationInput('minutes', $event)" type="number" class="source-input form-control" min="0" max="60" :value="duration[0]"/>
                        <span class="source-input form-control">:</span>
                        <input @input="durationInput('seconds', $event)" type="number" class="source-input form-control" min="0" max="60" :value="duration[1]"/>
                    </div>
                </span>
                <span v-if="inputType == inputTypes.slider" class="center stacked-input input-group flex-column input-group-sm gap-3">
                    <input @input="condition.value = $event.target!.value" type="range" class="source-input form-range m-auto" :value="condition.value"/>
                    <span class="m-auto">{{ parseInt(condition.value) / 10 }} / 10</span>
                </span>
            </template>
        </template>
    </div>
</template>

<script lang="ts">
import { Vue, Prop } from 'vue-property-decorator';
import { PlaylistCondition } from '../../../backend/src/types/playlist';
import { Filters } from '../../../backend/src/types/filters';
import Layout from '~/stores/layout';
import { FilterBoolean, FilterDate, FilterSlider } from '../../../backend/src/processing/matching';

enum inputTypes {
    value,
    date,
    time,
    slider,
    boolean
}

export default class EditCondition extends Vue {
    @Prop({required: true}) condition!: PlaylistCondition
    @Prop({required: true}) indent!: number

    MainFilters!: typeof Filters;
    SubFilters!: typeof Filters[keyof typeof Filters];
    Operations!: { [operation: string]: string };

    inputTypes = inputTypes;
    inputType: inputTypes = inputTypes.value;

    layout: Layout = null as any;

    /** Here we store values used for the GUI (such as timestamp to readable duration) */
    duration: [string, string] = ["0", "00"];

    created() {
        this.update();
    }

    mounted() {
        this.layout = new Layout();
        this.layout.render(null, true);
    }

    filterChange(event: Event, kind: "category" | "filter") {
        if (kind == "category") {
            this.condition.category = (event.target! as HTMLSelectElement).value as any;
        } else {
            this.condition.filter = (event.target! as HTMLSelectElement).value as any;
        }

        this.update();
        this.$forceUpdate();
        this.$emit('change', this.condition)
    }

    update() {
        this.MainFilters = Filters;
        this.SubFilters  = Filters[this.condition.category];

        // If we switch to a category that doesn't have the current filter, switch to the first filter
        if (this.SubFilters[this.condition.filter] == undefined) {
            this.condition.filter = Object.keys(Filters[this.condition.category])[0];
        }

        // Update the available operations
        this.Operations  = Filters[this.condition.category][this.condition.filter].type.operation;

        switch (Filters[this.condition.category][this.condition.filter].type) {
            case FilterDate:
                this.condition.value = new Date().toISOString().split('T')[0];
                this.inputType = inputTypes.date; break;
            case FilterSlider:
                this.condition.value = this.condition.value.toString() || "50";
                this.inputType = inputTypes.slider; break;
            case FilterBoolean:
                this.inputType = inputTypes.boolean; break;
            default:
                if (this.condition.filter.toLowerCase() == "duration") {
                    this.inputType = inputTypes.time;
                } else {
                    this.inputType = inputTypes.value;
                }
        }
    }

    durationInput(type: 'minutes' | 'seconds', event: Event) {
        const index = type == 'minutes' ? 0 : 1;
        let   value: number | string = (event.target! as HTMLInputElement).value;

        // If invalid or contains letters, reset to the original value
        if (!(/^\d+$/.test(value.toString()))) {
            this.duration[index] = this.duration[index];
            this.$forceUpdate();
        } if (value == '') {
            this.duration[index] = '0';
            this.$forceUpdate();
        } else {
            value = parseInt(value);

            if (0 < value && value < 60) {
                this.duration[index] = value.toString();
                return;
            }

            // If the value is too big, reset to the max value
            if (value > 60) {
                value = 60;
            }
            // If the value is too small, reset to the min value
            else if (value < 0) {
                value = 0;
            }
            // Don't hinder the user if the value is still valid
            else {
                this.duration[index] = value.toString();
                return;
            }

            // Append a leading 0 if the value is too small
            if (value < 10 && type == 'seconds')
                value = "0" + value;

            // Update the value
            this.duration[index] = value.toString();
            this.$forceUpdate();
        }

        // Update the actual value
        this.condition.value = (parseInt(this.duration[0]) * 60 + parseInt(this.duration[1])).toString();
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
.center {
    display: flex;
    align-items: center;
}

.f0 { grid-column: 2 / 6; }
.f1 { grid-column: 3 / 6; }
.f2 { grid-column: 4 / 6; }
.f3 { grid-column: 5 / 6; }

.operation { grid-column: 7 / 7; }
.stacked-operation { grid-column: 5 / -1; }

.input { grid-column: 9 / 9; }
.stacked-input {
    width: 75%;
    min-width: min(100%, 20rem);
    grid-column: 5 / -1;
}
.input.duration,
.stacked-input.duration {
    span, input {
        flex: 0;
        width: 3.5rem;
        min-width: unset;
        text-align: right;
    }
}
</style>