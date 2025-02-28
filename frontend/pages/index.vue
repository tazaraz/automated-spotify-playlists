<template>
    <article class="h-100 p-4 d-flex flex-column overflow-y-auto overflow-hidden placeholder-glow">
        <Title>Automated playlists</Title>
        <template v-if="user?.info">
            <h1>Hello,&nbsp; {{ user.info.name.split(' ')[0] }}</h1>
            <hr>
        </template>

        <p class="mt-2 mb-2">
            <h2 class="text-white">
                Automated playlists for Spotify
            </h2>
            <small>
                Create automated playlists for Spotify like you can on iTunes / Apple Music.
            </small>
        </p>

        <h5 v-if="!user?.info" class="mt-4 text-body-secondary"><url to="." @click="user?.login()"><u>Log in to see the full functionality of this web app</u></url></h5>
        <h4 class="mt-4">What is this?</h4>

        <span class="mt-2">
            This web app allows you to create automated playlists based on a variety of sources: your liked songs, albums of artists, or other playlist you or other people have created.
        </span>

        <span class="mt-2">
            Now, given a source (or sources), you can enhance your automated playlists based on a variety of filters, such as:
            <ul>
                <li>Track name</li>
                <li>Release date</li>
                <li>Popularity</li>
                <li>Positivity</li>
                <li>... and more!</li>
            </ul>
        </span>

        <span class="mt-2">
            These playlists are updated about every hour, so if you change another playlist or an artist releases a new album, and your automated playlist has this as a source, it will be updated automatically. Isn't that convenient?
        </span>

        <h4 class="mt-4 mb-2">Take a look at an example:</h4>
        <div v-if="editor" class="w-0">
            <button v-if="!editor?.id"
                    @click="showDemo"
                    class="btn btn-primary">Open example automated playlist configuration</button>
            <button v-else-if="editor?.id === 'example'"
                    class="btn btn-primary d-inline-flex text-nowrap me-3" disabled>
                <h5 class="m-auto me-2"><fa-icon :icon="['fas', 'wand-magic']" /></h5>
                Config open
            </button>
            <Modal v-else button-text="Open example automated playlist configuration" button-class="btn btn-primary">
                <div class="modal-header">
                    <h1 class="modal-title fs-5" id="exampleModalLabel">Discard current editor?</h1>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    You are currently already editing an automated playlist. If you open the example automated playlist configuration, your current changes will be discarded. Are you sure you want to continue?
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">No</button>
                    <button type="button" class="btn btn-danger" data-bs-dismiss="modal" @click="showDemo">Yes</button>
                </div>
            </Modal>
        </div>
        <small v-if="!user?.info" class="text-body-secondary">
            You are not logged in, meaning the example configuration is not completely functional.
        </small>

        <h4 class="mt-4 mb-2">This is open source!</h4>
        <div class="w-0">
            This web app is open source, meaning you can view the source code on <url to="https://github.com/tazaraz/automated-spotify-playlists" target="_blank">github</url>! If you are missing a feature, open a pull request.
            Note that I am limited to what Spotify allows via their <url to="https://developer.spotify.com/documentation/web-api/" target="_blank">API</url>, and as such cannot implement everything (searching for users for example).
        </div>
    </article>
</template>

<script lang="ts">
import { Vue, Component, toNative } from 'vue-facing-decorator';
import Editor from '~/stores/editor';
import Playlists, { type LoadedPlaylist } from '~/stores/playlists';
import User from '~/stores/user';

@Component({})
class Homepage extends Vue {
    playlists: Playlists = null as any;
    editor: Editor = null as any;
    user: User = null as any;

    async mounted() {
        this.playlists = new Playlists();
        this.editor = new Editor();
        this.user = new User();
    }

    /**
     * Resets the demo editor
     */
    async showDemo() {
        // I don't know why we need 4 nextTicks, but otherwise the view wont open.
        this.loadDemo();
        // Click the edit button to try and open the offcanvas edit view
        document.getElementById("mobile-open-edit")?.click();
    }

    /**
     * Shows the demo editor. Simply creates a fake user and playlist to show the editor.
     */
    async loadDemo() {
        // Create a fake user to build an automated playlist as example
        const playlist = this.playlists.buildAutomatedPlaylist() as LoadedPlaylist;
        playlist.id = 'example';
        playlist.index = 999;
        playlist.name = 'Example automated playlist';
        playlist.description = 'Some values, such as artists, albums, and genres, can only be retrieved when signed in.'

        playlist.sources = [
            {origin: "Library", value: ""},
            {origin: "Artist's Top Tracks", value: '3koiLjNrgRTNbOwViDipeA'}
        ]

        playlist.filters = {
            mode: 'all',
            filters: [
                {
                    category: 'Track',
                    filter: 'Positivity',
                    operation: 'is at least',
                    value: '61'
                }
            ]
        }

        this.editor.loadConfig(playlist);
    }
}

export default toNative(Homepage);
</script>