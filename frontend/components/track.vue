<template>
    <div class="accordion-item border-0 border-bottom">
        <h2 class="accordion-header">
            <button class="accordion-button shadow-none collapsed"
                    type="button"
                    @click="getFeatures()"
                    data-bs-toggle="collapse"
                    :data-bs-target="`#track:${track.id}`"
                ><div class="container d-flex gap-3 align-items-center ps-0">
                    <img class="flex-shrink-0" :src="track.image" />
                    <div class="flex-grow-1 multilayer m-0 d-grid">
                        <div class="text-truncate mb-1">
                            <url @click="follow" class="text-white" :to="`/info/track/${track.id}`">{{ track.name }}</url>
                        </div>
                        <div class="text-truncate">
                            <template v-for="(artist, index) in track.artists">
                                {{ index > 0 ? ", " : "" }}
                                <url @click="follow" :to="`/info/artist/${artist.id}`">{{ artist.name }}</url>
                            </template>
                        </div>
                    </div>
                    <div class="text-truncate flex-shrink-0 d-none d-lg-block" style="width: 40%;">
                        <url @click="follow" class="text-body" :to="`/info/album/${track.album!.id}`">{{ track.album!.name }}</url>
                    </div>
                    <div class="flex-shrink-0">{{ track.duration }}</div>
                    <div v-if="!deleteable">
                        <url data-bs-toggle="collapse" data-bs-target class="delete-icon" @click="$emit('delete', track)"></url>
                    </div>
                </div>
            </button>
        </h2>
        <div :id="`track:${track.id}`" class="accordion-collapse collapse">
            <div class="accordion-body">
                <div class="row placeholder-glow">
                    <div class="d-lg-none col-12 mb-2 multilayer">
                        <span>Album</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <url v-else :to="`/info/album/${track.album!.id}`">{{ track.album!.name }}</url>
                    </div>
                    <div class="col-xxl-6 col-9 mb-2 multilayer">
                        <span>Genres</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ trackGenres }} </span>
                    </div>
                    <div class="col-xxl-2 col-3 mb-2 multilayer"
                            data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                            :data-bs-title="FilterDescription.Track.BPM">
                        <span>BPM</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ Math.round(track.features.tempo) }}</span>
                    </div>
                    <div class="col-xxl-2 col-3 mb-2 multilayer"
                            data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                            :data-bs-title="FilterDescription.Track.Popularity">
                        <span>Popularity</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ track.popularity }}</span>
                    </div>
                    <div class="col-xxl-2 col-3 mb-2 multilayer"
                            data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                            :data-bs-title="FilterDescription.Track.Danceability">
                        <span>Danceability</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ Math.round(track.features.danceability * 100) }}%</span>
                    </div>
                    <div class="col-xxl-2 col-3 mb-2 multilayer"
                            data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                            :data-bs-title="FilterDescription.Track.Positivity">
                        <span>Positivity</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ Math.round(track.features.valence * 100) }}%</span>
                    </div>
                    <div class="col-xxl-2 col-3 mb-2 multilayer"
                            data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                            :data-bs-title="FilterDescription.Track.Energy">
                        <span>Energy</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ Math.round(track.features.energy * 100) }}%</span>
                    </div>
                    <div class="col-xxl-2 col-3 mb-2 multilayer"
                            data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                            :data-bs-title="FilterDescription.Track['is Acoustic']">
                        <span>Acoustic</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ track.features.acousticness > 0.5 ? "Yes" : "No" }}</span>
                    </div>
                    <div class="col-xxl-2 col-3 mb-2 multilayer"
                            data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                            :data-bs-title="FilterDescription.Track['has Vocals']">
                        <span>Vocals</span>
                        <span v-if="!track.features" class="placeholder rounded-1"></span>
                        <span v-else>{{ track.features.instrumentalness > 0.5 ? "No" : "Yes" }}</span>
                    </div>
                    <div class="col-xxl-2 col-3 mb-2 multilayer"
                            data-bs-toggle="tooltip" data-bs-delay='{"show":750,"hide":0}'
                            :data-bs-title="FilterDescription.Track['is Live']">
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
    @Prop({ required: true }) track!: CTrack;

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
}
</script>
<style scoped lang="scss">
.accordion-button {
    a {
        text-decoration: none;
    }
    img {
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