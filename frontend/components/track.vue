<template>
    <div class="accordion-item border-0 border-bottom">
        <h2 class="accordion-header">
            <button v-if="!track || placeholder" class="accordion-button shadow-none collapsed" type="button" data-bs-toggle="collapse" data-bs-target="undefined">
                <div class="container d-flex gap-3 align-items-center ps-0 placeholder-glow">
                    <span class="placeholder image flex-shrink-0"></span>
                    <div class="flex-grow-1 multilayer m-0 d-grid gap-1">
                        <div class="text-truncate placeholder rounded-1" :style="`width: ${randomBetween(6, 14)}rem`"></div>
                        <div class="text-truncate">
                            <template v-for="index in randomBetween(1, 3)">
                                {{ index - 1 > 0 ? ", " : "" }}
                                <div class="placeholder rounded-1 text-truncate" :style="`width: ${randomBetween(2, 5)}rem`"></div>
                            </template>
                        </div>
                    </div>
                    <div class="text-truncate flex-shrink-0" style="width: 40%;"  data-main-class="normal-d-block tiny-d-none" >
                        <span class="placeholder rounded-1" :style="`width: ${randomBetween(3, 15)}rem`"></span>
                    </div>
                    <div class="text-truncate flex-shrink-0" style="width: 10%;">
                        <span class="placeholder rounded-1 ms-auto d-block" :style="`width: ${randomBetween(2, 3)}rem`"></span>
                    </div>
                </div>
            </button>
            <button v-else class="accordion-button shadow-none collapsed" type="button" @click="getFeatures()" data-bs-toggle="collapse" :data-bs-target="`#track:${track.id}`">
                <div class="container d-flex gap-3 align-items-center ps-0">
                    <Image :src="track" />
                    <div class="flex-grow-1 multilayer m-0 gap-1">
                        <div class="text-truncate">
                            <url @click="follow" class="text-white" :to="`/info/track/${track.id}`">{{ track.name }}</url>
                        </div>
                        <div class="text-truncate">
                            <template v-for="(artist, index) in track.artists">
                                {{ index > 0 ? ", " : "" }}
                                <url @click="follow" :to="`/info/artist/${artist.id}`">{{ artist.name }}</url>
                            </template>
                        </div>
                    </div>
                    <div class="flex-shrink-0 text-truncate" data-main-class="normal-d-block tiny-d-none" style="width: 40%;">
                        <url @click="follow" class="text-truncate d-inline-block text-body" :to="`/info/album/${track.album!.id}`">{{ track.album!.name }}</url>
                    </div>
                    <div class="flex-shrink-0" style="width: 10%;">{{ track.duration }}</div>
                    <i v-if="deleteable" @click="$emit('delete', track)" data-bs-toggle="collapse" data-bs-target=""><fa-icon style="color: rgb(155, 0, 0)" :icon="['fas', 'trash-can']"></fa-icon></i>
                </div>
            </button>
        </h2>
        <div v-if="track && !placeholder" :id="`track:${track.id}`" class="accordion-collapse collapse">
            <div class="accordion-body">
                <div class="row placeholder-glow">
                    <div class="col-12 mb-2 multilayer" data-main-class="normal-d-none">
                        <span>Album</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <url v-else :to="`/info/album/${track.album!.id}`" class="text-decoration-underline">{{
                            track.album!.name }}</url>
                    </div>
                    <div class="mb-2 multilayer" data-main-class="normal-col-6 tiny-col-9">
                        <span>Genres</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ trackGenres }} </span>
                    </div>
                    <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                        <InfoField :description="Filters.Track.BPM.description">BPM</InfoField>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ Math.round(track.features.tempo) }}</span>
                    </div>
                    <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                        <InfoField :description="Filters.Track.Popularity.description">Popularity</InfoField>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ track.popularity / 10 }} / 10</span>
                    </div>
                    <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                        <InfoField :description="Filters.Track.Danceability.description">Danceability</InfoField>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ Math.round(track.features.danceability * 100) / 10 }} / 10</span>
                    </div>
                    <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                        <InfoField :description="Filters.Track.Positivity.description">Positivity</InfoField>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ Math.round(track.features.valence * 100) / 10 }} / 10</span>
                    </div>
                    <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                        <InfoField :description="Filters.Track.Energy.description">Energy</InfoField>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ Math.round(track.features.energy * 100) / 10 }} / 10</span>
                    </div>
                    <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                        <InfoField :description="Filters.Track.Accousticness.description">Acoustic</InfoField>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ Math.round(track.features.acousticness * 100) / 10 }} / 10</span>
                    </div>
                    <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                        <InfoField :description="Filters.Track.Vocality.description">Vocals</InfoField>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ Math.round(track.features.instrumentalness * 100) / 10 }} / 10</span>
                    </div>
                    <div class="mb-2 multilayer" data-main-class="large-col-2 normal-col-3 tiny-col-6">
                        <InfoField :description="Filters.Track.Liveness.description">Live</InfoField>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                    <span v-else>{{ Math.round(track.features.liveness * 100) / 10 }} / 10</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { Tooltip } from 'bootstrap';
import { Emit, Prop, Vue } from 'vue-property-decorator';
import { CArtist, CTrack, CTrackFeatures } from '~/../backend/src/types/client';
import { Filters } from '~/../backend/src/types/filters';
import Fetch from '~/stores/fetch';

@Emit('delete')
export default class Track extends Vue {
    @Prop({ required: false }) track!: CTrack;
    @Prop({ default: false }) placeholder!: boolean;
    @Prop({ default: false }) deleteable!: boolean;

    expanded = false;
    trackGenres = '';

    Filters = Filters;

    async getFeatures(state: boolean | undefined = undefined) {
        this.trackGenres = (await Fetch.get<CArtist>(`spotify:/artists/${this.track.artists![0].id}`)).data.genres.join(', ') || "No genres have been found";

        if (!this.track.features) {
            this.track.features = (await Fetch.get<CTrackFeatures>(`spotify:/audio-features/${this.track.id}`)).data;
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
</script>
<style scoped lang="scss">
.accordion-button {
    a {
        text-decoration: none;
    }

    .image {
        width: 3rem;
        height: 3rem;
    }
}

.accordion-button a:hover,
.accordion-body a:hover {
    color: $gray-300 !important;
    text-decoration: underline;
}
</style>