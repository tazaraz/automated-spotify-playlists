<template>
    <div class="track accordion-item border-0">
        <h2 v-if="!track || typeof track === 'string'" class="accordion-header m-0">
            <div class="accordion-button shadow-none collapsed py-2 small-ps-2">
                <div class="container ms-0 d-flex gap-3 align-items-center ps-0">
                    <Image :src="null" class="image" />
                    <div class="flex-grow-1 multilayer m-0 d-grid gap-1">
                        <div class="text-truncate placeholder rounded-1" :style="`width: ${randomBetween(6, 14)}rem`"></div>
                        <div class="text-truncate">
                            <template v-for="index in randomBetween(1, 3)">
                                {{ index - 1 > 0 ? ", " : "" }}
                                <div class="placeholder rounded-1 text-truncate" :style="`width: ${randomBetween(2, 5)}rem`"></div>
                            </template>
                        </div>
                    </div>
                    <div class="text-truncate flex-shrink-0 small-d-none" style="width: 40%;">
                        <span class="placeholder rounded-1" :style="`width: ${randomBetween(3, 15)}rem`"></span>
                    </div>
                    <div class="text-truncate flex-shrink-0" style="width: 12%;">
                        <span class="placeholder rounded-1 ms-auto d-block" :style="`width: ${randomBetween(3, 4)}ch`"></span>
                    </div>
                </div>
            </div>
        </h2>
        <template v-else>
            <h2 class="m-0">
                <button class="accordion-button shadow-none collapsed py-2 small-ps-2"
                        @click="getFeatures()"
                        data-bs-toggle="collapse"
                        :data-bs-target="`#track:${track.id}`">
                    <div class="container ms-0 d-flex gap-3 align-items-center ps-0">
                        <Image :src="track.image ?? (track.is_local?'none':'')" />
                        <div class="flex-grow-1 multilayer m-0 gap-1">
                            <div class="text-truncate">
                                <url v-if="track.id"
                                     @click="follow"
                                     class="text-white"
                                     :to="`/info/track/${track.id}`">{{ track.name }}</url>
                                <span v-else>{{ track.name }}</span>
                            </div>
                            <div class="text-truncate">
                                <template v-for="(artist, index) in track.artists">
                                    {{ index > 0 ? ", " : "" }}
                                    <url v-if="artist.id"
                                         @click="follow"
                                         :to="`/info/artist/${artist.id}`">{{ artist.name }}</url>
                                    <span v-else>{{ artist.name }}</span>
                                </template>
                            </div>
                        </div>
                        <div v-if="track.appearsIn" class="small-d-none flex-grow-0 multilayer text-truncate gap-0" style="width: 40%;">
                            <template v-if="track.appearsIn.length > 0">
                                <div class="text-truncate">
                                    Appears in
                                </div>
                                <div class="text-truncate">
                                    <template v-for="(appearsIn, index) in track.appearsIn">
                                        {{ index > 0 ? ", " : "" }}
                                        <url @click="follow" :to="`/playlist/${appearsIn.id}`">{{ appearsIn.name }}</url>
                                    </template>
                                </div>
                            </template>
                        </div>
                        <div v-else-if="track.album" class="small-d-none flex-shrink-0 text-truncate" style="width: 40%;">
                            <url v-if="track.album.id" @click="follow" class="text-truncate d-inline-block text-body" :to="`/info/album/${track.album.id}`">
                                {{ track.album.name }}
                            </url>
                            <span v-else>{{ track.album.name }}</span>
                        </div>
                        <div class="flex-shrink-0" style="width: 10%;">{{ track.duration }}</div>
                        <i v-if="deleteable" @click="$emit('delete', track)" data-bs-toggle="collapse" data-bs-target=""><fa-icon style="color: rgb(155, 0, 0)" :icon="['fas', 'trash-can']"></fa-icon></i>
                    </div>
                </button>
            </h2>
            <div v-if="track && typeof track !== 'string' && !track.is_local" :id="`track:${track.id}`" class="accordion-collapse collapse">
                <div class="accordion-body border-bottom">
                    <div class="row">
                        <div class="normal-d-none col-12 mb-2 multilayer">
                            <span>Album</span>
                            <span v-if="!track?.features" class="placeholder rounded-1"></span>
                            <url v-else-if="track?.album" :to="`/info/album/${track.album.id}`" class="text-decoration-underline text-nowrap" style="width: min-content">
                                {{ track.album!.name }}
                            </url>
                            <span v-else>{{ track.album }}</span>
                        </div>
                        <div v-if="track.appearsIn" class="normal-d-none mb-2 multilayer" data-main-class="small-d-grid">
                            <template v-if="track.appearsIn.length > 0">
                                <span>Appears in</span>
                                <span>
                                    <template v-for="(appearsIn, index) in track.appearsIn">
                                        {{ index > 0 ? ", " : "" }}
                                        <url @click="follow" :to="`/playlist/${appearsIn.id}`">{{ appearsIn.name }}</url>
                                    </template>
                                </span>
                            </template>
                        </div>
                        <div class="mb-2 multilayer" data-main-class="normal-col-3-6 small-col-6-9">
                            <ToolTip :description="Filters.Album.Genres.description">Album Genres</ToolTip>
                            <span v-if="!track?.features" class="placeholder rounded-1"></span>
                            <span v-else>{{ albumGenres }} </span>
                        </div>
                        <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                            <ToolTip :description="Filters.Track.BPM.description">BPM</ToolTip>
                            <span v-if="!track?.features" class="placeholder rounded-1"></span>
                            <span v-else>{{ Math.round(track.features.tempo) }}</span>
                        </div>
                        <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                            <ToolTip :description="Filters.Track.Popularity.description">Popularity</ToolTip>
                            <span v-if="!track?.album" class="placeholder rounded-1"></span>
                            <span v-else>{{ (track.popularity || track.album.popularity) / 10 || '?' }} / 10</span>
                        </div>
                        <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                            <ToolTip :description="Filters.Track.Danceability.description">Danceability</ToolTip>
                            <span v-if="!track?.features" class="placeholder rounded-1"></span>
                            <span v-else>{{ Math.round(track.features.danceability * 100) / 10 }} / 10</span>
                        </div>
                        <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                            <ToolTip :description="Filters.Track.Positivity.description">Positivity</ToolTip>
                            <span v-if="!track?.features" class="placeholder rounded-1"></span>
                            <span v-else>{{ Math.round(track.features.valence * 100) / 10 }} / 10</span>
                        </div>
                        <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                            <ToolTip :description="Filters.Track.Energy.description">Energy</ToolTip>
                            <span v-if="!track?.features" class="placeholder rounded-1"></span>
                            <span v-else>{{ Math.round(track.features.energy * 100) / 10 }} / 10</span>
                        </div>
                        <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                            <ToolTip :description="Filters.Track.Accousticness.description">Acoustic</ToolTip>
                            <span v-if="!track?.features" class="placeholder rounded-1"></span>
                            <span v-else>{{ Math.round(track.features.acousticness * 100) / 10 }} / 10</span>
                        </div>
                        <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                            <ToolTip :description="Filters.Track.Vocality.description">Vocals</ToolTip>
                            <span v-if="!track?.features" class="placeholder rounded-1"></span>
                            <span v-else>{{ Math.round((1 - track.features.instrumentalness) * 100) / 10 }} / 10</span>
                        </div>
                        <div class="large-col-2 normal-col-3 small-col-6 mb-2 multilayer">
                            <ToolTip :description="Filters.Track.Liveness.description">Live</ToolTip>
                            <span v-if="!track?.features" class="placeholder rounded-1"></span>
                            <span v-else>{{ Math.round(track.features.liveness * 100) / 10 }} / 10</span>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script lang="ts">
import { Vue, Component, toNative, Prop, Emit } from 'vue-facing-decorator';
import type { CArtist, CTrack, CTrackFeatures } from '~/../backend/src/shared/types/client';
import { FilterDescriptions as Filters } from '~/../backend/src/shared/types/descriptions';
import Fetch from '~/composables/fetch';

@Emit('delete')
@Component({})
class Track extends Vue {
    @Prop({ required: true }) track!: CTrack | string | null;
    @Prop({ default: false }) deleteable!: boolean;

    expanded = false;
    albumGenres = '';

    Filters = Filters;

    /**
     * Gets the features of the track and toggles the accordion
     * @param state State of the accordion. If undefined, it will be toggled
     */
    async getFeatures(state: boolean | undefined = undefined) {
        // This wont work if it is a local track
        if ((this.track as CTrack).is_local) return;

        Fetch.get<CArtist[]>(`spotify:/artists`, { ids: (this.track as CTrack).artists!.map(artist => artist.id) })
        .then(response => {
            // Get the genres of the artists. Remove duplicates
            const genres = response.data.map(a => a.genres).flat().filter((v, i, a) => a.indexOf(v) === i);
            this.albumGenres = genres.join(', ') || "No genres have been found";
        })

        if (!(this.track as CTrack).features) {
            (this.track as CTrack).features = (await Fetch.get<CTrackFeatures>(`spotify:/audio-features/${(this.track as CTrack).id}`)).data;
        }

        this.expanded = state ?? !this.expanded;
    }

    /**
     * Follows the url of the clicked element. Used in the accordion header as urls do not work here
     * @param event Click event of the url
     */
    follow(event: Event) {
        navigateTo((event.target! as HTMLAnchorElement).pathname)
    }

    randomBetween(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }
}

export default toNative(Track);
</script>

<style scoped lang="scss">
main.small {
    .small-ps-2 { padding-left: 0.5rem; }
    // col-6
    .small-col-6 { flex: 0 0 auto; width: 50%; }
}

main.normal {
    // col-3
    .normal-col-3 { flex: 0 0 auto; width: 25%; }
}

main.large {
    // col-2
    .large-col-2 { flex: 0 0 auto; width: 16.66666667%; }
}
</style>

<style scoped lang="scss">
.accordion-item.small {
    .small-d-none {
        display: none;
    }
}

.accordion-button a {
    text-decoration: none;
}

.image {
    width: 2.5rem;
    height: 2.5rem;
}

.accordion-button a:hover,
.accordion-body a:hover {
    color: $gray-300 !important;
    text-decoration: underline;
}
</style>