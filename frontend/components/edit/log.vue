<template>
    <div v-if="logs">
        <template v-if="logs.length == 0 || !logs[selectedLog]">
            <div class="d-flex">
                <h5 class="m-auto ms-0 me-3">
                    Log:
                </h5>
                <select class="log-select form-select form-select-sm w-auto">
                    <option>No logs yet</option>
                </select>
            </div>
            <span class="d-block mb-2 text-body-secondary" style="font-size: 80%;">
                Only unique logs are kept.
            </span>

            <h5 class="mt-4">Sources</h5>
            <span class="d-block mb-2 text-body-secondary">
                Result: none
            </span>

            <h5 class="mt-4 mb-0">Filters</h5>
            <span class="d-block mb-2 text-body-secondary">
                Result: none
            </span>
        </template>
        <template v-else>
            <div class="d-flex">
                <h5 class="m-auto ms-0 me-3">
                    Log:
                </h5>
                <select class="log-select form-select form-select-sm w-auto" @change="selectedLogChange">
                    <option v-for="log, index in logs" :value="index" :selected="index == selectedLog">{{ log.name }}</option>
                </select>
            </div>

            <h5 class="mb-0">Sources</h5>
            <span v-if="logs[selectedLog].sources[logs[selectedLog].sources.length - 1]?.startsWith('All')" class="d-block mb-2 text-body-secondary">
                Result: {{ logs[selectedLog].sources[logs[selectedLog].sources.length - 1] }}
            </span>
            <ul class="list-unstyled">
                <template v-for="source of logs[selectedLog].sources">
                    <li class="ms-3" v-if="!source.startsWith('All')">{{ source }}</li>
                </template>
            </ul>

            <h5 class="mt-4 mb-0">Filters</h5>
            <span v-if="logs[selectedLog].filters[logs[selectedLog].filters.length - 1]?.startsWith('Converted')" class="d-block mb-2 text-body-secondary">
                Result: {{ logs[selectedLog].filters[logs[selectedLog].filters.length - 1] }}
            </span>
            <div class="d-block">
                <template v-for="log of statements">
                    <div v-if="!log.value.startsWith('Converted')" class="d-flex"><i v-for="i of log.indent" class="ms-4"></i>
                        <span class="border-start border-top-0 border-2 border-info ps-2 mt-1 mb-1">{{ log.value }}</span>
                    </div>
                </template>
            </div>
        </template>
    </div>
</template>
<script lang="ts">
import { Vue, Prop } from 'vue-property-decorator';
import { Playlist } from '../../../backend/src/shared/types/playlist';
import Playlists from '~/stores/playlists';

export default class EditLog extends Vue {
    playlists: Playlists = null as any;
    logs: Playlist['logs'] = [];

    selectedLog: number = 0;
    indent: number = 0;
    statements: {value: string, indent: number}[] = [];

    created() {
        this.playlists = new Playlists();
        this.logs = this.playlists.editor.logs;
        this.selectedLog = Math.max(0, this.logs.length - 1);

        // Parse the last log
        if (this.logs.length > 0) this.parseLogs();

        watch(() => this.playlists.editor.logs, () => {
            this.logs = this.playlists.editor.logs;
            this.parseLogs();
        });
    }

    /**
     * Change the selected log
     * @param event The selected new log
     */
    async selectedLogChange(event: Event) {
        this.selectedLog = parseInt((event.target! as HTMLOptionElement).value);
        this.parseLogs();
    }

    parseLogs() {
        this.indent = 0;
        this.statements = [];

        const stack = [];
        let index = 0;
        for (const l of this.logs[this.selectedLog]?.filters || []) {
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