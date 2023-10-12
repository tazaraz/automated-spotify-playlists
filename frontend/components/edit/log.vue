<template>
    <div v-if="log">
        <h5 class="mb-0">Sources</h5>
        <span v-if="log.sources[log.sources.length - 1]?.startsWith('All')" class="d-block mb-2 text-body-secondary">
            Result: {{ log.sources[log.sources.length - 1] }}
        </span>
        <ul class="list-unstyled">
            <template v-for="source of log.sources">
                <li class="ms-3" v-if="!source.startsWith('All')">{{ source }}</li>
            </template>
        </ul>

        <h5 class="mt-4 mb-0">Filters</h5>
        <span v-if="log.filters[log.filters.length - 1]?.startsWith('Converted')" class="d-block mb-2 text-body-secondary">
            Result: {{ log.filters[log.filters.length - 1] }}
        </span>
        <div class="d-block">
            <template v-for="log of statements">
                <div v-if="!log.value.startsWith('Converted')" class="d-flex"><i v-for="i of log.indent" class="ms-4"></i>
                    <span class="border-start border-top-0 border-2 border-info ps-2 mt-1 mb-1">{{ log.value }}</span>
                </div>
            </template>
        </div>
    </div>
</template>

<script lang="ts">
import { Vue, Prop } from 'vue-property-decorator';
import { Playlist } from '../../../backend/src/shared/types/playlist';

export default class EditLog extends Vue {
    @Prop({required: true}) log!: Playlist['log'];

    indent: number = 0;
    statements: {value: string, indent: number}[] = [];

    created() {
        this.parseLogs();
        watch(() => this.log, () => this.parseLogs());
    }

    parseLogs() {
        this.indent = 0;
        this.statements = [];

        const stack = [];
        let index = 0;
        for (const l of this.log?.filters || []) {
            if (l.startsWith('Start')) {
                this.addStatement(l);
                stack.push(index++);
            } else if (l.startsWith('End')) {
                this.removeIndent(l, stack.pop()!);
            } else {
                index++;
                this.statements.push({value: l, indent: this.indent});
            }
        }
    }

    addStatement(log: string) {
        this.statements.push({
            indent: this.indent++,
            value: log,
        });
    }

    removeIndent(log: string, index: number) {
        this.indent--;
        this.statements[index].value = log.replace('End ', '').charAt(0).toUpperCase() + log.replace('End ', '').slice(1);
        return true;
    }
}
</script>