import { LOG } from "../main";
import Filters from "../processing";
import Database from "../tools/database";
import Fetch from "../tools/fetch";
import Users from "./users";

export default class Updater {
    /** Interval for checking for changes */
    private static interval: NodeJS.Timer;
    /** Update speed in seconds */
    private static updateSpeed: number = 20;

    /**
     * Starts a cronjob to update the playlist certain amount of time
     */
    static schedule(){
        /**
         * Note that if a user registers just after an access_token refresh, it has to wait for all the access_tokens
         * to expire before it can run. Therefore we execute updateUsers if a new user registers, to add it immediately.
         */
        setInterval(async () => {
            let timer;
            let performance: number[] = [];
            const users = await Database.getAllUsers();

            for (const dbuser of users) {
                try {
                    /* Get the user and their playlists */
                    const playlists = await Database.getUserPlaylists(dbuser.id);
                    const user      = await Users.get(dbuser.id)

                    /* Sequentially update all playlists. Don't spam Spotify */
                    for (const playlist of playlists) {
                        try {
                            timer = process.hrtime();
                            Filters.execute(playlist.id, user)
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
        }, 1000 * 60 * 60 * 24);
    }
}
