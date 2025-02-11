<template>
    <Title>Search</Title>
    <article class="h-100 p-4 d-flex flex-column overflow-y-auto overflow-hidden placeholder-glow">
        <div class="input-group p-2" style="max-width: 60rem;">
            <input ref="query" type="search" spellcheck="false" autocorrect="off"
                    class="form-control"
                    :value="query || searcher.query"
                    placeholder="Type to search"
                    @input="search" @paste="search">
            <span v-if="query !== '' && query !== undefined"
                    id="clear-button"
                    class="btn input-group-text border-top border-bottom px-2"
                    @click="query = ''">
                <i><fa-icon :icon="['fas', 'circle-xmark']"></fa-icon></i>
            </span>
            <input type="checkbox" class="btn-check" id="help" autocomplete="off">
            <label ref="advancedTrigger"
                    class="btn btn-outline-secondary"
                    data-bs-toggle="collapse"
                    data-bs-target="#help"
                    for="help">
                <i><fa-icon :icon="['fas', 'question']"></fa-icon></i>
            </label>
            <span class="btn btn-outline-primary input-group-text px-1" @click="search">
                <i><fa-icon :icon="['fas', 'search']" style="width:2rem;"></fa-icon></i>
            </span>
        </div>
        <div class="collapse p-2" id="help">
            <h6 class="p-2 pt-0">You can narrow down your search using these field filters.</h6>
            You can search here as you normally would, but the following extra tricks exist:
            <hr>
        </div>
        <div v-if="error.severity > 0" :class="`alert ${error.severity == 1 ? 'alert-info':'alert-warning'} p-2 m-2 mb-0`" role="alert">
            {{ error.message }}
        </div>

        <div>
            <template v-if="searcher.result.artist">
                <h5 class="text-white mt-3 p-2 pb-0">Artists</h5>
                <ol class="nav flex-nowrap overflow-auto ps-2">
                    <url v-for="artist of searcher.result.artist"
                         :to="`/info/artist/${artist.id}`"
                         class="w-25 mb-3" style="min-width: 8rem; max-width: 11rem;">
                        <div class="card h-100 p-3 border-0">
                            <Image :src="artist.image" class="rounded-2"/>
                            <div class="card-body d-flex flex-column pt-3 p-0">
                                <h6 class="card-title d-block text-truncate">{{ artist.name }}</h6>
                                <span>Genres</span>
                                <span class="word-wrap text-body-secondary" style="font-size: 85%;">
                                    {{ artist.description![0].name || 'No known genres' }}
                                </span>
                            </div>
                        </div>
                    </url>
                    <h6 v-if="searcher.result.artist.length == 0">Artisn't. Can't find any artist matching your artistic search</h6>
                </ol>
            </template>
            <template v-if="searcher.result.track">
                <h5 class="text-white mt-3 p-2 pb-0">Tracks</h5>
                <ol class="nav nav-pills flex-column ps-2">
                    <li v-for="track of searcher.result.track" class="nav-item cursor-pointer">
                        <url :to="`/info/track/${track.id}`" class="ps-2 text-body d-flex nav-link">
                            <img class="result-image" :src="track.image">
                            <div class="multilayer">
                                <span class="ms-3 text-truncate">{{ track.name }}</span>
                                <span class="ms-3 text-truncate">{{ track.description?.map(a => a.name).join(', ') }}</span>
                            </div>
                        </url>
                    </li>
                    <li v-if="searcher.result.track.length == 0">
                        <h6>Spotify didn't find anything, you must have brought it off track </h6>
                    </li>
                </ol>
            </template>
            <template v-if="searcher.result.album">
                <h5 class="text-white mt-3 p-2 pb-0">Albums</h5>
                <ol class="nav flex-nowrap overflow-auto ps-2">
                    <url v-for="album of searcher.result.album"
                         :to="`/info/album/${album.id}`"
                         class="w-25 mb-3" style="min-width: 8rem; max-width: 11rem;">
                        <div class="card h-100 p-3 border-0">
                            <Image :src="album.image" class="rounded-2"/>
                            <div class="card-body d-flex flex-column pt-3 p-0">
                                <h6 class="card-title d-block text-truncate">{{ album.name }}</h6>
                                <span class="word-wrap text-body-secondary">{{ album.description?.map(a => a.name).join(', ') }}</span>
                            </div>
                        </div>
                    </url>
                    <h6 v-if="searcher.result.album.length == 0">Spotify says no</h6>
                </ol>
            </template>
            <template v-if="searcher.result.playlist">
                <h5 class="text-white mt-3 p-2 pb-0">Playlists</h5>
                <ol class="nav flex-nowrap overflow-auto ps-2">
                    <url v-for="playlist of searcher.result.playlist"
                         :to="`/info/playlist/${playlist.id}`"
                         class="w-25 mb-3" style="min-width: 8rem; max-width: 11rem;">
                        <div class="card h-100 p-3 border-0">
                            <Image :src="playlist.image" class="rounded-2" style="min-width: 7rem; max-width: 10rem;"/>
                            <div class="card-body d-flex flex-column pt-3 p-0">
                                <h6 class="card-title d-block text-truncate">{{ playlist.name }}</h6>
                                <span class="word-wrap text-body-secondary" style="font-size: 85%;">
                                    {{ playlist.description![0].name }}
                                </span>
                            </div>
                        </div>
                    </url>
                    <h6 v-if="searcher.result.playlist.length == 0">It does not seem to exist...</h6>
                </ol>
            </template>
            <h4 v-if="!searcher.result.artist && !searcher.result.track && !searcher.result.album && !searcher.result.playlist"
                class="text-center mt-5 p-2 pb-0">
                No results yet to show
            </h4>
        </div>
    </article>
</template>

<script lang="ts">
import { Vue, Component, toNative } from 'vue-facing-decorator';
import Searcher from '~/stores/search';

@Component({})
class Search extends Vue {
    searcher: Searcher = null as any;

    query: string = "";
    error = {
        message: '',
        severity: 0
    }

    input!: HTMLInputElement;

    created() {
        this.searcher = new Searcher();
        if (this.searcher.query) this.searcher.search(this.searcher.query);
    }

    mounted() {
        this.input = this.$refs.query as HTMLInputElement;
    }

    timeout!: NodeJS.Timeout;
    /**
     * Executes a search
     */
    search() {
        let query = this.input.value;

        // Check if the query is empty
        if (query == '') {
            this.query = '';
            this.searcher.reset();
            return
        }

        // Check if the search is valid
        query = this.processQuery(query);

        // Save the query
        this.query = query;

        // Check if the error is severe
        if (this.error.severity == 2) return;

        // Execute the search
        clearTimeout(this.timeout);
        this.timeout = setTimeout(() => {
            this.searcher.search(query)
        }, 250);
    }

    processQuery(query: string): string {
        // Replace any ": " with ":"
        query = query.replace(/: /g, ':');
        // Replace double spaces with single spaces
        query = query.replace(/  /g, ' ');

        // split on " "
        const split = query.split(" ");

        let hasError = false;
        // For each ":", check if the prefix is valid
        for (const part of split) {
            if (part.includes(':')) {
                const [filter, value] = part.split(':');

                // Check if the filter is valid
                if (!this.searcher.filters.includes(filter as any)) {
                    this.error = {
                        message: `Possible invalid filter "${filter}"`,
                        severity: 1
                    }
                    hasError = true;
                }

                // Check if the value is valid
                if (this.searcher.filters.includes(filter as any) && value === '') {
                    this.error = {
                        message: `Complete the filter: "${filter}:something"`,
                        severity: 2
                    };
                    hasError = true;
                }
            }
        }

        if (!hasError)
            this.error = { message: '', severity: 0 };

        return query;
    }

    resetSearch() {
        this.input.value = '';
        this.input.focus();
    }
}

export default toNative(Search);
</script>

<style lang="scss" scoped>
.result-image {
    width: 3rem;
    height: 3rem;
}
</style>