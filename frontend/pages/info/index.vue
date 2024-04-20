<template>
    <Title>Search</Title>
    <article class="rounded-2 p-2 bg-dark-subtle flex-grow-1 overflow-hidden">
        <SmallHeader :item="{name: 'Search', image: ['fas', 'search']}"></SmallHeader>
        <div class="overflow-hidden overflow-y-auto h-100" data-edit-class="full-d-none">
            <div v-if="error" class="alert alert-info" role="alert">
                {{ error }}
            </div>

            <div class="input-group p-2">
                <input ref="query" type="text" class="form-control" placeholder="Type to search"
                    :value="info.searchConfig?.query" @keypress="$event.key === 'Enter' ? search() : undefined">
                <input type="checkbox" class="btn-check" id="advancedSearch" autocomplete="off"
                    :checked="info.searchConfig?.is_advanced">
                <label ref="advancedTrigger" class="btn btn-outline-secondary" data-bs-toggle="collapse" data-bs-target="#advancedSearch"
                    for="advancedSearch">
                    <span class="d-md-block d-none">Advanced</span>
                    <i class="d-sm-none d-block"><fa-icon :icon="['fas', 'sliders']"></fa-icon></i>
                </label>
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
                    <InfoField description="This tag will return albums released in the past two weeks">
                        <input id="advancedSearchNew" ref="t:N" class="form-check-input" type="checkbox">
                        <label class="form-check-label" for="advancedSearchNew">tag:new</label>
                    </InfoField>
                    <InfoField description="This tag will return only albums with the lowest 10% popularity">
                        <input id="advancedSearchHipster" ref="t:H" class="form-check-input" type="checkbox">
                        <label class="form-check-label" for="advancedSearchHipster">tag:hipster</label>
                    </InfoField>
                </div>
                <hr>
            </div>
            <h6 class="p-2 pt-0 m-0">Kinds of items to include in the result:</h6>
            <div class="d-flex gap-3 ms-3">
                <div class="form-check">
                    <input ref="s:Tr" id="searchTrack" class="form-check-input" type="checkbox"
                        :checked="info.searchConfig?.track ?? true">
                    <label class="form-check-label" for="searchTrack">Track</label>
                </div>
                <div class="form-check">
                    <input ref="s:Al" id="searchAlbum" class="form-check-input" type="checkbox"
                        :checked="info.searchConfig?.album ?? true">
                    <label class="form-check-label" for="searchAlbum">Album</label>
                </div>
                <div class="form-check">
                    <input ref="s:Ar" id="searchArist" class="form-check-input" type="checkbox"
                        :checked="info.searchConfig?.artist ?? true">
                    <label class="form-check-label" for="searchArist">Artist</label>
                </div>
                <div class="form-check">
                    <input ref="s:Pl" id="searchPlaylist" class="form-check-input" type="checkbox"
                        :checked="info.searchConfig?.playlist ?? true">
                    <label class="form-check-label" for="searchPlaylist">Playlist</label>
                </div>
            </div>
            <div>
                <template v-if="info.searchResult.artists">
                    <h5 class="text-white mt-3 p-2 pb-0">Artists</h5>
                    <ol class="nav flex-nowrap overflow-auto ps-2">
                        <Card v-for="artist of info.searchResult.artists" :card="{image: artist.image, title: artist.name, url: `/info/artist/${artist.id}`}" class="me-2">
                            <span>Genres</span>
                            <span class="word-wrap text-body-secondary" style="font-size: 85%;">
                                {{ artist.description![0].name || 'No known genres' }}
                            </span>
                        </Card>
                        <h6 v-if="info.searchResult.artists.length == 0">Artisn't. Can't find any artist matching your artistic search</h6>
                    </ol>
                </template>
                <template v-if="info.searchResult.tracks">
                    <h5 class="text-white mt-3 p-2 pb-0">Tracks</h5>
                    <ol class="nav nav-pills flex-column ps-2">
                        <li v-for="track of info.searchResult.tracks" class="nav-item cursor-pointer">
                            <url :to="`/info/track/${track.id}`" class="ps-2 text-body d-flex nav-link">
                                <img class="result-image" :src="track.image">
                                <div class="multilayer">
                                    <span class="ms-3 text-truncate">{{ track.name }}</span>
                                    <span class="ms-3 text-truncate">{{ track.description?.map(a => a.name).join(', ') }}</span>
                                </div>
                            </url>
                        </li>
                        <li v-if="info.searchResult.tracks.length == 0">
                            <h6>Spotify didn't find anything, you must have brought it off track </h6>
                        </li>
                    </ol>
                </template>
                <template v-if="info.searchResult.albums">
                    <h5 class="text-white mt-3 p-2 pb-0">Albums</h5>
                    <ol class="nav flex-nowrap overflow-auto ps-2">
                        <Card v-for="album of info.searchResult.albums" :card="{image: album.image, title: album.name, url: `/info/album/${album.id}`}" class="me-2">
                            <span class="word-wrap text-body-secondary">{{ album.description?.map(a => a.name).join(', ') }}</span>
                        </Card>
                        <h6 v-if="info.searchResult.albums.length == 0">Spotify says no</h6>
                    </ol>
                </template>
                <template v-if="info.searchResult.playlists">
                    <h5 class="text-white mt-3 p-2 pb-0">Playlists</h5>
                    <ol class="nav flex-nowrap overflow-auto ps-2">
                        <Card v-for="playlist of info.searchResult.playlists" :card="{image: playlist.image, title: playlist.name, url: `/info/playlist/${playlist.id}`}" class="me-2">
                            <span class="word-wrap text-body-secondary" style="font-size: 85%;">
                                {{ playlist.description![0].name }}
                            </span>
                        </Card>
                        <h6 v-if="info.searchResult.playlists.length == 0">It does not seem to exist...</h6>
                    </ol>
                </template>
            </div>
        </div>
    </article>
</template>

<script lang="ts">
import { Emit, Vue } from 'vue-property-decorator';
import Info, { SearchConfig } from '~/stores/info';

@Emit('delete')
export default class InfoSearch extends Vue {
    info: Info = null as any;
    error: string | null = null;

    created() {
        if (!process.client) return;
        this.info = new Info();
        if (this.info.searchConfig) this.info.search(this.info.searchConfig);
    }

    /**
     * Executes a search
     */
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

        // Create the search config
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

    /**
     * Checks if the input actually contains advanced search data
     * @param advanced Advanced search config
     */
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
}
</style>