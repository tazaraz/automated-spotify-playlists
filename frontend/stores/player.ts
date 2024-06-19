import { Store, Pinia } from "pinia-class-component";
import Fetch from "./fetch";
import User from "./user";

interface NowPlayingItem {
    image: string
    track: {
        name: string
        id: string
    }
    artists: {
        name: string
        id: string
    }[]
}

@Store
/**
 * Maintains a history of the pages the user has visited
 */
export default class NowPlaying extends Pinia {
    playing: NowPlayingItem | null = null;
    user: User = null as any;
    interval: NodeJS.Timer | null = null;

    init() {
        if (this.interval)
            return;

        this.user = new User();

        // Try to update the player every 20 seconds
        this.update();
        this.interval = setInterval(this.update, 20000);
    }

    update() {
        if (this.user.dataExists()) {
            this.updatePlayer();
        }
    }

    private updatePlayer() {
        Fetch.get('spotify:/me/player/currently-playing')
        .then(response => {
            // Do preparations
            if (response.status !== 200) return;
            else if (!response.data?.item) return;
            // Update the player if necessary
            else if (!this.playing) this.playing = {} as any;
            else if (this.playing.track.id === response.data.item.id) return;

            const track = response.data.item;
            this.playing!.image = Fetch.bestImage(track.album.images);
            this.playing!.track = {
                name: track.name,
                id: track.id
            }
            this.playing!.artists = track.artists.map((artist: any) => { return {
                name: artist.name,
                id: artist.id
            }})
        })
    }
}