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
            <div v-if="!infoLog" class="d-flex">
                <h5 class="m-auto ms-0 me-3">
                    Log:
                </h5>
                <select class="log-select form-select form-select-sm w-auto" @change="selectedLogChange">
                    <option v-for="log, index in logs" :value="index" :selected="index == selectedLog">{{ log.name }}</option>
                </select>
            </div>

            <template v-if="!infoLog">
                <h5 class="mb-0 mt-4">Sources</h5>
                <span v-if="logs[selectedLog].sources[logs[selectedLog].sources.length - 1]?.startsWith('All')" class="d-block mb-2 text-body-secondary">
                    Result: {{ logs[selectedLog].sources[logs[selectedLog].sources.length - 1] }}
                </span>
                <ul class="list-unstyled">
                    <template v-for="source of logs[selectedLog].sources">
                        <li class="ms-3" v-if="!source.startsWith('All')">{{ source }}</li>
                    </template>
                </ul>
            </template>

            <h5 class="mt-4 mb-0">Filters</h5>
            <span v-if="!infoLog && logs[selectedLog].filters[logs[selectedLog].filters.length - 1]?.startsWith('Converted')" class="d-block mb-2 text-body-secondary">
                Result: {{ logs[selectedLog].filters[logs[selectedLog].filters.length - 1] }}
            </span>
            <div class="d-block">
                <template v-for="log, index of statements">
                    <div v-if="!log.value.startsWith('Converted') && !log.value.startsWith('Info:')" class="d-flex">
                        <i v-for="i of log.indent" class="ms-4"></i>
                        <div class="d-flex flex-column border-start border-top-0 border-2 border-info ps-2 mt-1 mb-1">
                            <span role="button"
                                  data-bs-toggle="collapse"
                                  :data-bs-target="`#log${index}`"
                                  @click="rotateCollapseIcon(index)">
                                <fa-icon
                                    :id="`log-collapse-${index}`"
                                    class="rotation me-1"
                                    :icon="['fas', 'angle-right']" v-if="getDataAttributes(index).length > 0"></fa-icon>
                                {{ log.value }}
                            </span>

                            <table :id="`log${index}`"
                                   class="collapse"
                                   style="border-collapse: separate; border-spacing: 1rem 0">
                                <thead class="text-info">
                                    <th>Name</th>
                                    <th>Value</th>
                                    <th>Filter</th>
                                </thead>
                                <tbody class="text-secondary">
                                    <tr v-for="data of getDataAttributes(index)">
                                        <td>{{ data.value[1] }}</td>
                                        <td>{{ Math.round(Number(data.value[2])) / 10 }}</td>
                                        <td>{{ Math.round(Number(data.value[3])) / 10 }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </template>
            </div>
        </template>
    </div>
</template>
<script lang="ts">
import { Vue, Prop } from 'vue-property-decorator';
import { PlaylistCondition, PlaylistLog } from '../../../backend/src/shared/types/playlist';
import Playlists from '~/stores/playlists';
import Editor from '~/stores/editor';

export default class EditLog extends Vue {
    @Prop({ default: null }) infoLog!: PlaylistLog;
    editor: Editor = null as any;

    logs: PlaylistLog[] = [];
    selectedLog: number = 0;

    indent: number = 0;
    statements: {value: string, indent: number}[] = [];

    created() {
        this.editor = new Editor();

        watch(() => [this.infoLog, this.editor.logs], () => {
            this.logs = this.infoLog ? [this.infoLog] : this.editor.logs;
            this.parseLogs();
        });

        if (!this.editor.logs) return;

        if (this.infoLog) {
            this.logs = [this.infoLog];
            this.selectedLog = 0;
        } else {
            this.logs = this.editor.logs;
            this.selectedLog = Math.max(0, this.logs.length - 1);
        }

        // Parse the last log
        if (this.logs.length > 0) this.parseLogs();
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
                this.statements.push({value: l, indent: this.indent});
                index++;
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
        this.statements[index].value = log.slice(4);
        return true;
    }

    getDataAttributes(index: number) {
        const info: {indent: number, value: string[]}[] = [];
        while (this.statements[--index]?.value.startsWith('Info:')) {
            info.push({
                indent: this.statements[index].indent,
                value: this.statements[index].value.split(':')
            });
        }

        return info;
    }

    rotateCollapseIcon(index: number) {
        const collapseIcon = document.getElementById(`log-collapse-${index}`)
        collapseIcon?.classList.toggle('rotated')
    }
}
</script>

<style lang="scss">
.rotation {
    transition: 0.2s ease-in;
}
.rotated {
    transform: rotate(90deg);
}
</style>