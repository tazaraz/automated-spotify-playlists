import Filters from "../processing";
import Database from "../tools/database";
import Fetch from "../tools/fetch";
import Users from "./users";

export default class Snapshots {
    // Contains the snapshot id of a playlist. If this changes, the playlist has changed
    private static snapshots: {[playlist_id: string]: {user_id: string, snapshot_id: string}} = {};
    private static interval: NodeJS.Timer;
    private static updateSpeed: number = 10000;

    static async watch() {
        const playlists = await Database.getAllPlaylists();

        for (const playlist of playlists)
            Snapshots.set(playlist.id, playlist.user_id, "")

        Snapshots.createInterval(Snapshots.updateSpeed);
    }

    static set(playlist_id: string, user_id: string, snapshot_id: string) {
        this.snapshots[playlist_id] = {user_id, snapshot_id};
    }

    private static createInterval(speed: number) {
        Snapshots.updateSpeed = speed;
        clearInterval(Snapshots.interval);

        Snapshots.interval = setInterval(Snapshots.detectChange, Snapshots.updateSpeed);
    }

    private static async detectChange() {
        for (const playlist_id in Snapshots.snapshots) {
            const playlist = Snapshots.snapshots[playlist_id];

            // Get the from Spotify
            Fetch.get(`/playlists/${playlist_id}/`, {
                user: await Users.get(playlist.user_id)
            }).then(async response => {
                // Too many requests, lower the update speed
                if (response.status === 429)
                    return Snapshots.createInterval(Snapshots.updateSpeed + 1000);

                // No changes have been made
                if (response.status == 304)
                    return

                else if (Snapshots.snapshots[playlist_id].snapshot_id == "")
                    Snapshots.set(playlist_id, playlist.user_id, response.data.snapshot_id)

                // If the snapshot id has changed, update the playlist
                else if (Snapshots.snapshots[playlist_id].snapshot_id !== playlist.snapshot_id) {
                    Snapshots.set(playlist_id, playlist.user_id, response.data.snapshot_id);
                    Filters.execute(playlist_id, await Users.get(playlist.user_id))
                }
            })
        }
    }
}
