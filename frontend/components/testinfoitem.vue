<template>
    <h4 id="test-matching" class="ms-4 mt-4 mb-0">Detailed matching info</h4>
    <div class="ms-4 ps-3">
        <div class="mb-2 text-muted">Here you can view what data the server has recieved and is using for matching</div>
        <template v-if="!editor || !editor.shown">
            Open an automatic playlist's config editor to run this {{ kind }} against the filters of that playlist
        </template>
        <template v-else>
            <button class="btn btn-primary me-1" @click="execute">
                <template v-if="executeState === 0">Run</template>
                <template v-else-if="executeState === 1">Running...</template>
                <template v-else-if="executeState === 2">Ran</template>
            </button>
            this {{ kind }} against the filters in the currently open editor
        </template>
        <EditLog v-if="editor?.shown && log" :infoLog="log"/>
    </div>
</template>

<script lang="ts">
import { Prop, Vue } from  'vue-property-decorator';
import Editor from '~/stores/editor';
import Fetch from '~/stores/fetch';
import { PlaylistLog } from '../../backend/src/shared/types/playlist';
import FetchError from '~/stores/error';

export default class TestInfoItem extends Vue {
    @Prop() kind!: "track" | "album" | "artist"
    @Prop() id!: string

    editor: Editor = null as any;

    /** The logs of the filtering process */
    log: PlaylistLog = null as any;
    /** 0: default, 1: pending, 2: finished */
    executeState = 0;
    /** Interval after which a message will be displayed */
    applyTestStuckMessage: {
        timeout: NodeJS.Timeout;
        show: boolean;
    } = { timeout: null as any, show: false };

    created() {
        this.editor = new Editor();
    }

    async execute() {
        if (this.executeState === 2) return;

        this.executeState = 1;
        this.log = null as any;

        this.applyTestStuckMessage.timeout = setTimeout(() => {
            this.applyTestStuckMessage.show = true;
        }, 10000);

        /** Start the execution of the playlist */
        const result = await Fetch.patch(`server:/info/${this.kind}/test`, { data: {
            id: this.id,
            source: [{ origin: "Track", value: this.id }],
            filters: this.editor.filters
        }})

        // Wait for the execution to finish
        while (true) {
            /** Response is when running only the log, and when completed a playlist */
            const response = await Fetch.patch(`server:/info/${this.kind}/test`, { data: {
                id: this.id,
                source: [{ origin: "Track", value: this.id }],
                filters: this.editor.filters
            }})

            if (response.status === 302) {
                this.log = response.data;
                continue;
            } else if (response.status === 200) {
                this.log = response.data;
                break;
            } else {
                FetchError.create({
                    status: response.status,
                    message: await response.json(),
                });
                break;
            }
        }

        clearTimeout(this.applyTestStuckMessage.timeout);
        this.applyTestStuckMessage.show = false;
        this.executeState = 2;

        await this.$nextTick();
        document.getElementById("test-matching")?.scrollIntoView({ behavior: "smooth" });
    }
}
</script>

<style scoped>
#filters {
    /* :deep(button) {
        visibility: hidden;
    } */
    :deep(select) {
        opacity: 0.6;
        pointer-events: none;
    }
    &.small .filter-item {
        grid-template-columns: repeat(3, 1rem) max-content 1.5rem max-content 1.5rem 1fr repeat(3, 2rem);
    }
    &.normal .filter-item {
        grid-template-columns: repeat(3, 1rem) max-content 1.5rem 1fr 0 0 repeat(3, 2rem);
    }
    &.large .filter-item {
        grid-template-columns: repeat(3, 1rem) max-content 0 1fr 0 0 repeat(3, 2rem);
    }
}
#filters .filter-item {
    display: grid;
    grid-auto-rows: 40px;
}

:deep(#playlist-export) {
    margin: 0 !important;
}
</style>