import { LOG, LOG_DEBUG, THROW_DEBUG_ERROR } from "../main";
import Filters from "../processing";
import Database from "../tools/database";
import Users from "../stores/users";
import Fetch from "./fetch";
import { Playlist } from "../shared/types/playlist";

export default class Updater {
    /**
     * Starts a cronjob to update the playlist certain amount of time
     */
    static schedule(){
        // Run the updater every hour
        setInterval(async () => Updater.updatePlaylists, 1000 * 60 * 60);
    }
    /**
     * Updates all playlists in the database
     */
    static async updatePlaylists() {
        let timer: any;
        let performance: number[] = [];
        const users = await Database.getAllUsers();

        // We process the playlist for each user
        for (const dbuser of users) {
            try {
                /* Get the user and their playlists */
                const playlists = await Database.getUserPlaylists(dbuser.id);
                const user      = await Users.get(dbuser.id)

                /* Sequentially update all playlists. Don't spam Spotify */
                for (const playlist of playlists) {
                    try {
                        timer = process.hrtime();
                        /** We wait for each playlist to be processed.
                         * This should get faster and faster as more metadata is cached */
                        await Filters.execute(playlist.id, user);
                        performance.push(process.hrtime(timer)[1] / 1000000);
                    } catch (e) {
                        LOG(`Something went wrong while updating playlist with id: ${playlist.id}: \n${e}`);
                    }
                }
            } catch (e) {
                LOG(`Something is wrong with user ${dbuser.name} (id: ${dbuser.id}): \n${e}`);
            }
        }

        /* Log the performance */
        const date = new Date();
        const total = performance.reduce((a, b) => a + b, 0),
                avg = total / performance.length,
                max = Math.max(...performance);
        LOG(`${date.toISOString()}: Updating playlists performance: \n - total: ${total}ms \n - avg: ${avg}ms \n - max: ${max}ms`);
    }
    }
}
