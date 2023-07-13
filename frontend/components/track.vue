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
                    <div class="text-truncate flex-shrink-0" style="width: 40%;"  data-main-class="normal-d-block small-d-none" >
                        <span class="placeholder rounded-1" :style="`width: ${randomBetween(2, 5)}rem`"></span>
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
                    <div class="flex-shrink-0 text-truncate" data-main-class="normal-d-block small-d-none" style="width: 40%;">
                        <url @click="follow" class="text-truncate d-inline-block text-body" :to="`/info/album/${track.album!.id}`">{{ track.album!.name }}</url>
                    </div>
                    <div class="flex-shrink-0" style="width: 10%;">{{ track.duration }}</div>
                    <i v-if="deleteable" @click="$emit('delete', track)"><fa-icon style="color: rgb(155, 0, 0)"
                            :icon="['fas', 'trash-can']"></fa-icon></i>
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
                    <div class="mb-2 multilayer" data-main-class="normal-col-6 small-col-9">
                        <span>Genres</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ trackGenres }} </span>
                    </div>
                    <div class="mb-2 multilayer" data-main-class="normal-col-2 small-col-3" data-bs-toggle="tooltip"
                         data-bs-delay='{"show":750,"hide":0}' :data-bs-title="FilterDescription.Track.BPM">
                        <span>BPM</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ Math.round(track.features.tempo) }}</span>
                    </div>
                    <div class="mb-2 multilayer" data-main-class="normal-col-2 small-col-3" data-bs-toggle="tooltip"
                         data-bs-delay='{"show":750,"hide":0}' :data-bs-title="FilterDescription.Track.Popularity">
                        <span>Popularity</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ track.popularity }}</span>
                    </div>
                    <div class="mb-2 multilayer" data-main-class="normal-col-2 small-col-3" data-bs-toggle="tooltip"
                         data-bs-delay='{"show":750,"hide":0}' :data-bs-title="FilterDescription.Track.Danceability">
                        <span>Danceability</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ Math.round(track.features.danceability * 100) }}%</span>
                    </div>
                    <div class="mb-2 multilayer" data-main-class="normal-col-2 small-col-3" data-bs-toggle="tooltip"
                         data-bs-delay='{"show":750,"hide":0}' :data-bs-title="FilterDescription.Track.Positivity">
                        <span>Positivity</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ Math.round(track.features.valence * 100) }}%</span>
                    </div>
                    <div class="mb-2 multilayer" data-main-class="normal-col-2 small-col-3" data-bs-toggle="tooltip"
                         data-bs-delay='{"show":750,"hide":0}' :data-bs-title="FilterDescription.Track.Energy">
                        <span>Energy</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ Math.round(track.features.energy * 100) }}%</span>
                    </div>
                    <div class="mb-2 multilayer" data-main-class="normal-col-2 small-col-3" data-bs-toggle="tooltip"
                         data-bs-delay='{"show":750,"hide":0}' :data-bs-title="FilterDescription.Track['is Acoustic']">
                        <span>Acoustic</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ track.features.acousticness > 0.5 ? "Yes" : "No" }}</span>
                    </div>
                    <div class="mb-2 multilayer" data-main-class="normal-col-2 small-col-3" data-bs-toggle="tooltip"
                         data-bs-delay='{"show":750,"hide":0}' :data-bs-title="FilterDescription.Track['has Vocals']">
                        <span>Vocals</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ track.features.instrumentalness > 0.5 ? "No" : "Yes" }}</span>
                    </div>
                    <div class="mb-2 multilayer" data-main-class="normal-col-2 small-col-3" data-bs-toggle="tooltip"
                         data-bs-delay='{"show":750,"hide":0}' :data-bs-title="FilterDescription.Track['is Live']">
                        <span>Live</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ track.features.liveness > 0.8 ? "Yes" : "No" }}</span>
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
import { FilterDescription } from '~/../backend/src/types/descriptions';
import Fetch from '~/stores/fetch';

@Emit('delete')
export default class Track extends Vue {
    @Prop({ required: false }) track!: CTrack;
    @Prop({ default: false }) placeholder!: boolean;

    expanded = false;
    trackGenres = '';
    deleteable = false;

    FilterDescription = FilterDescription;
    tooltipList: Tooltip[] = [];

    async getFeatures(state: boolean | undefined = undefined) {
        this.trackGenres = (await Fetch.get<CArtist>(`spotify:/artists/${this.track.artists![0].id}`)).data.genres.join(', ') || "No genres have been found";

        if (!this.track.features) {
            this.track.features = (await Fetch.get<CTrackFeatures>(`spotify:/audio-features/${this.track.id}`)).data;
            const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
            this.tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new this.$bootstrap.Tooltip(tooltipTriggerEl))
        }

        this.expanded = state ?? !this.expanded;
    }

    beforeUnmount() {
        this.tooltipList.forEach(tooltip => tooltip.disable());
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