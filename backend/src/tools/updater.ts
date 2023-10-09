import { LOG, THROW_DEBUG_ERROR } from "../main";
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
        // Clean up the database every 4 days
        setInterval(async () => Updater.cleanDatabase, 1000 * 60 * 60 * 24 * 4);
        Updater.cleanDatabase();
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

    /**
     * Cleans the database from playlists which are not in Spotify anymore. This can happen if a user deletes a
     * playlist which also has no followers. We don't want to keep these playlists in our database as this is
     * more computing.
     */
    static async cleanDatabase() {
        const db_users = await Database.getAllUsers();
        const db_playlists = await Database.getAllPlaylists();

        // Get all user playlists from Spotify
        const users_playlists: { [user_id: string]: Playlist[] } = {};
        for (const user of db_users) {
            const response = await Fetch.get<Playlist[]>(`/users/${user.id}/playlists`, {
                user: await Users.get(user.id),
                pagination: true
            });

            if (response.status !== 200)
                THROW_DEBUG_ERROR(`Cleaning: failed to get playlists for user_id: ${user.id}. Error: \n${response}`);
            else
                users_playlists[user.id] = response.data;
        }

        /** We want to remove playlists in our database which are lonely in Spotify (no followers or user) */
        const remove: Playlist[] = [];
        for (const playlist of db_playlists) {
            // If the user does not have this playlist anymore
            if (!users_playlists[playlist.user_id].some(p => p.id === playlist.id)) {
                const response = await Fetch.get(`/playlists/${playlist.id}`, {
                    user: await Users.get(playlist.user_id)
                });
                // And the playlist has no followers, delete it
                if (response.status == 200 && response.data?.followers.total == 0)
                    remove.push(playlist);
            }
        }

        LOG(`Cleaning database: removing ${remove.length} playlists...`);

        // Remove the playlists
        for (const playlist of remove)
            await Database.deletePlaylist(playlist.user_id, playlist.id);
    }
}
