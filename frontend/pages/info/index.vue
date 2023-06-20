<template>
    <Title>Search</Title>
    <article class="rounded-2 p-2 bg-dark-subtle overflow-hidden">
        <div class="pe-1 overflow-hidden overflow-y-auto h-100">
            <div v-if="error" class="alert alert-info" role="alert">
                {{ error }}
            </div>

            <div class="input-group p-2">
                <input ref="query" type="text" class="form-control" placeholder="Type to search"
                    :value="info.searchConfig?.query" @keypress="$event.key === 'Enter' ? search() : undefined">
                <input type="checkbox" class="btn-check" id="advancedSearch" autocomplete="off"
                    :checked="info.searchConfig?.is_advanced">
                <label ref="advancedTrigger" class="btn btn-outline-secondary" data-bs-toggle="collapse" data-bs-target="#advancedSearch"
                    for="advancedSearch">Advanced</label>
                <span class="btn btn-outline-primary input-group-text ps-2 pe-0" @click="search()">
                    <i><fa-icon :icon="['fas', 'search']" style="width:2rem; padding-right: .5rem;"></fa-icon></i>
                </span>
            </div>
            <div :class="'collapse p-2' + (info.searchConfig?.is_advanced ? ' show' : '')" id="advancedSearch">
                <h6 class="p-2 pt-0">You can narrow down your search using these field filters.</h6>
                <div class="input-group mb-3">
                    <span class="input-group-text">Tracks</span>
                    <input ref="fTrs" type="text" class="form-control" placeholder="name 1, name 2, ..."
                        :value="info.searchConfig?.advanced?.tracks.toString()">
                </div>
                <div class="input-group mb-3">
                    <span class="input-group-text">Albums</span>
                    <input ref="fAls" type="text" class="form-control" placeholder="name 1, name 2, ..."
                        :value="info.searchConfig?.advanced?.albums.toString()">
                </div>
                <div class="input-group mb-3">
                    <span class="input-group-text">Artists</span>
                    <input ref="fArs" type="text" class="form-control" placeholder="name 1, name 2, ..."
                        :value="info.searchConfig?.advanced?.artists.toString()">
                </div>
                <div class="input-group mb-3">
                    <span class="input-group-text">Year</span>
                    <input ref="fYr" type="text" class="form-control" placeholder="1970 or a range: 1990-2005"
                        :value="info.searchConfig?.advanced?.year">
                </div>
                <div class="d-flex gap-3 ms-3">
                    <div class="form-check" data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                        data-bs-title="This tag will return albums released in the past two weeks">
                        <input ref="t:N" class="form-check-input" type="checkbox">
                        <label class="form-check-label" for="flexCheckDefault">tag:new</label>
                    </div>
                    <div class="form-check" data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                        data-bs-title="This tag will return only albums with the lowest 10% popularity">
                        <input ref="t:H" class="form-check-input" type="checkbox">
                        <label class="form-check-label" for="flexCheckDefault">tag:hipster</label>
                    </div>
                </div>
                <hr>
            </div>
            <h6 class="p-2 pt-0 m-0">Kinds of items to include in the result:</h6>
            <div class="d-flex gap-3 ms-3">
                <div class="form-check">
                    <input ref="s:Tr" id="searchTrack" class="form-check-input" type="checkbox"
                        :checked="info.searchConfig ? info.searchConfig.track : true">
                    <label class="form-check-label" for="searchTrack">Track</label>
                </div>
                <div class="form-check">
                    <input ref="s:Al" id="searchAlbum" class="form-check-input" type="checkbox"
                        :checked="info.searchConfig?.album">
                    <label class="form-check-label" for="searchAlbum">Album</label>
                </div>
                <div class="form-check">
                    <input ref="s:Ar" id="searchArist" class="form-check-input" type="checkbox"
                        :checked="info.searchConfig?.artist">
                    <label class="form-check-label" for="searchArist">Artist</label>
                </div>
                <div class="form-check">
                    <input ref="s:Pl" id="searchPlaylist" class="form-check-input" type="checkbox"
                        :checked="info.searchConfig?.playlist">
                    <label class="form-check-label" for="searchPlaylist">Playlist</label>
                </div>
            </div>
            <div>
                <template v-if="info.searchResult.playlists.length > 0">
                    <h5 class="text-white mt-3 p-2 pb-0">Playlists</h5>
                    <ol class="nav nav-pills flex-column ps-2">
                        <li v-for="playlist of info.searchResult.playlists" class="nav-item cursor-pointer">
                            <url :to="`/info/playlist/${playlist.id}`" class="ps-2 text-body d-flex nav-link">
                                <img class="result-image rounded-1" :src="playlist.image">
                                <div class="result-multilayer">
                                    <span class="ms-3 text-truncate">{{ playlist.name }}</span>
                                    <span class="ms-3 text-truncate">
                                        {{ playlist.description![0].name }}
                                        &nbsp;&nbsp;━&nbsp;&nbsp;
                                        {{ playlist.description![0].description }}
                                    </span>
                                </div>
                            </url>
                        </li>
                    </ol>
                </template>
                <template v-if="info.searchResult.artists.length > 0">
                    <h5 class="text-white mt-3 p-2 pb-0">Artists</h5>
                    <ol class="nav nav-pills flex-column ps-2">
                        <li v-for="artist of info.searchResult.artists" class="nav-item cursor-pointer">
                            <url :to="`/info/artist/${artist.id}`" class="ps-2 text-body d-flex nav-link">
                                <img class="result-image rounded-1" :src="artist.image">
                                <div class="multilayer">
                                    <span class="ms-3 text-truncate">{{ artist.name }}</span>
                                    <span class="ms-3 text-truncate">Genres: {{ artist.description![0].name || 'none known' }}</span>
                                </div>
                            </url>
                        </li>
                    </ol>
                </template>
                <template v-if="info.searchResult.tracks.length > 0">
                    <h5 class="text-white mt-3 p-2 pb-0">Tracks</h5>
                    <ol class="nav nav-pills flex-column ps-2">
                        <li v-for="track of info.searchResult.tracks" class="nav-item cursor-pointer">
                            <url :to="`/info/track/${track.id}`" class="ps-2 text-body d-flex nav-link">
                                <img class="result-image rounded-1" :src="track.image">
                                <div class="multilayer">
                                    <span class="ms-3 text-truncate">{{ track.name }}</span>
                                    <span class="ms-3 text-truncate">{{ track.description?.map(a => a.name).join(', ') }}</span>
                                </div>
                            </url>
                        </li>
                    </ol>
                </template>
                <template v-if="info.searchResult.albums.length > 0">
                    <h5 class="text-white mt-3 p-2 pb-0">Albums</h5>
                    <ol class="nav nav-pills flex-column ps-2">
                        <li v-for="album of info.searchResult.albums" class="nav-item cursor-pointer">
                            <url :to="`/info/album/${album.id}`" class="ps-2 text-body d-flex nav-link">
                                <img class="result-image rounded-1" :src="album.image">
                                <div class="multilayer">
                                    <span class="ms-3 text-truncate">{{ album.name }}</span>
                                    <span class="ms-3 text-truncate">{{ album.description?.map(a => a.name).join(', ') }}</span>
                                </div>
                            </url>
                        </li>
                    </ol>
                </template>
            </div>
        </div>
    </article>
</template>

<script lang="ts">
import { Tooltip } from 'bootstrap';
import { Emit, Vue } from 'vue-property-decorator';
import Info, { SearchConfig } from '~/stores/info';

@Emit('delete')
export default class InfoSearch extends Vue {
    info!: Info;

    tooltipList: Tooltip[] = [];
    error: string | null = null;

    created() {
        if (!process.client) return;
        this.info = new Info();
        if (this.info.searchConfig) this.info.search(this.info.searchConfig);
    }

    async mounted() {
        const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
        this.tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new this.$bootstrap.Tooltip(tooltipTriggerEl))
    }

    beforeUnmount() {
        this.tooltipList.forEach(tooltip => tooltip.disable());
    }

    async search() {
        const advanced: SearchConfig['advanced'] = {
            tracks: (this.$refs['fTrs'] as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean),
            albums: (this.$refs['fAls'] as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean),
            artists: (this.$refs['fArs'] as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean),
            year: (this.$refs['fYr'] as HTMLInputElement).value.trim(),
            tag_new: (this.$refs['t:N'] as HTMLInputElement).checked,
            tag_hipster: (this.$refs['t:H'] as HTMLInputElement).checked,
        }

        // Check if advanced search is enabled and if it is, check if it's used
        const advanced_is_open = document.getElementById('advancedSearch')!.classList.contains('show');

        // Close advanced search if it's open but not used
        if (advanced_is_open && !this.isAdvanced(advanced))
            (this.$refs['advancedTrigger'] as HTMLLabelElement).click();

        const config: SearchConfig = {
            query: (this.$refs['query'] as HTMLInputElement).value.trim(),
            track: (this.$refs['s:Tr'] as HTMLInputElement).checked,
            album: (this.$refs['s:Al'] as HTMLInputElement).checked,
            artist: (this.$refs['s:Ar'] as HTMLInputElement).checked,
            playlist: (this.$refs['s:Pl'] as HTMLInputElement).checked,
            is_advanced: advanced_is_open && this.isAdvanced(advanced),
            advanced: advanced_is_open && this.isAdvanced(advanced) ? advanced : undefined,
        }

        // Check if the search is valid
        if (config.query === "")
            return this.error = "Please fill in the search field"
        if (!config.track && !config.album && !config.artist && !config.playlist)
            return this.error = "Please select at least one kind of item to include in the result"

        this.error = null;

        // Execute the search
        await this.info.search(config)
    }

    isAdvanced(advanced: SearchConfig['advanced']) {
        return advanced !== undefined &&
            (advanced.tracks.length > 0 || advanced.albums.length > 0 ||
                advanced.artists.length > 0 || advanced.year.length > 0 ||
                advanced.tag_new || advanced.tag_hipster)
    }
}
</script>

<style lang="scss" scoped>
.result-image {
    width: 3rem;
    height: 3rem;
    object-position: 50% 50%;
    object-fit: cover;
}

</style>