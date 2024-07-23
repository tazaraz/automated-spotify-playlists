import { LOG, THROW_DEBUG_ERROR } from "../main";
import Filters, { ProcessLevel } from "../processing";
import Database from "../tools/database";
import Users from "../stores/users";
import Fetch from "./fetch";
import { Playlist } from "../shared/types/playlist";
import FilterTask from "../stores/filtertask";
import Metadata from "../stores/metadata";
import Cache from "../stores/cache";

export default class Updater {
    /**
     * Starts a cronjob to update the playlist certain amount of time
     */
    static schedule(){
        // Run the updater every hour
        setInterval(() => Updater.updatePlaylists(), 1000 * 60 * 60);
        // Clean up the database every 4 days
        setInterval(() => Updater.cleanDatabase(), 1000 * 60 * 60 * 24 * 4);
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
                        const task = new FilterTask(`playlist:${playlist.id}`, ProcessLevel.PLAYLIST);
                        timer = process.hrtime();
                        /** We wait for each playlist to be processed.
                         * This should get faster and faster as more metadata is cached */
                        await Filters.executePlaylist(task, playlist.id, user, true);
                        performance.push(process.hrtime(timer)[1] / 1000000);
                    } catch (e) {
                        LOG(`Something went wrong while updating playlist with id: ${playlist.id}: \n${e}`);
                        LOG(e.stack)
                    }
                }
            } catch (e) {
                LOG(`Something is wrong with user ${dbuser.name} (id: ${dbuser.id}): \n${e}`);
                LOG(e.stack)
            }
        }

        /* Log the performance */
        const date = new Date();
        const total = performance.reduce((a, b) => a + b, 0),
                avg = total / performance.length,
                max = Math.max(...performance);
        LOG(`${date.toISOString()}: Updating playlists performance: \n - total: ${(Math.round(total))}ms \n - avg: ${Math.round(avg)}ms \n - max: ${Math.round(max)}ms`);
    }

    /**
     * Cleans the database from playlists which are not in Spotify anymore. This can happen if a user deletes a
     * playlist which also has no followers. We don't want to keep these playlists in our database as this is
     * more computing.
     */
    static async cleanDatabase() {
        const db_users = await Database.getAllUsers();
        const db_playlists = await Database.getAllPlaylists();

        type UPlaylist = {
            id: string
            name: string
            owner: {id: string, display_name: string}
            followers: {total: number}
        };

        const remove: UPlaylist[] = [];
        const users: {[id: string]: string[]} = {};

        for (const playlist of db_playlists) {
            const sp_playlist = await Fetch.get<UPlaylist>(`/playlists/${playlist.id}`, {
                user: await Users.get(playlist.user_id),
                query: { fields: 'id, name, owner.id, owner.display_name, followers.total' }
            }).then(r => r.data);

            if (users[playlist.user_id] === undefined) {
                users[playlist.user_id] = await Fetch.get<{id: string}[]>(`/users/${playlist.user_id}/playlists`, {
                    user: await Users.get(playlist.user_id),
                    pagination: true,
                    query: { fields: 'items(id)' }
                }).then(r => r.data.map(p => p.id));
            }

            if (sp_playlist.followers.total == 0 && !users[playlist.user_id].includes(playlist.id)) {
                remove.push(sp_playlist)
            }
        }

        LOG(`Cleaning database. Playlists removed: ${remove.length}`)

        // Remove the playlists
        for (const playlist of remove) {
            LOG(`Removed playlist ${playlist.name} (${playlist.id}).\nAttributes:\n - User: ${(playlist as any).owner.display_name}\n - Followers: ${playlist.followers.total}\n - Owner follows playlist: ${users[playlist.owner.id].includes(playlist.id)}\n - url: https://open.spotify.com/playlist/${playlist.id}\n`);
            // await Database.deletePlaylist(user_id, playlist.id);
        }
    }
}
