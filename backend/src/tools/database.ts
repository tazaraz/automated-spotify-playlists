import { Client as postgresClient } from 'pg';
import { Playlist } from '../shared/types/playlist';
import { LOG_DEBUG, LOG } from '../main';
import { DBUser, SUser } from '../shared/types/server';

export default class Database {
    private static client: postgresClient;

    /**
     * Connect to postgres. Should be executed first before any other methods
     */
    static async connect() {
        while (true) {
            // Create postgres client
            Database.client = new postgresClient();

            // Attempt to connect to postgres
            try {
                await Database.client.connect();
                break;
            } catch (err) {
                // If the connection to postgres is refused, retry every 5 seconds
                if (err.code === 'ECONNREFUSED') {
                    LOG_DEBUG('Postgres connection refused, retrying in 5 seconds...');
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                } else {
                    throw err;
                }
            }
        }
        LOG('Connected to postgres main database');
        return this;
    }

    /**
     * Gets a user from the database
     * @param id user id
     */
    static async getUser(id: string) {
        const result = await Database.client.query(`SELECT * FROM users WHERE id = '${id}'`);
        return result?.rows[0] as DBUser | undefined;
    }

    /**
     * Gets all users from the database
     */
    static async getAllUsers() {
        const result = await Database.client.query(`SELECT * FROM users`);
        return result?.rows as DBUser[];
    }

    /**
     * Saves/updates a user to the database
     * @param user user information to save
     */
    static async setUser(user: SUser) {
        const query = await Database.client.query(`
            INSERT INTO users (id, name, country, refresh_token) VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO UPDATE
                    SET name = $5, country = $6, refresh_token = $7`,
            [user.id, user.name, user.country, user.refresh_token,
            user.name, user.country, user.refresh_token]);

        return query.rowCount > 0 ? true : false;
    }

    /**
     * Deletes a user from the database. Disables updating for all their playlists
     * @param user User to delete
     */
    static async deleteUser(user: SUser | DBUser) {
        const query = await Database.client.query(`DELETE FROM users WHERE id = $1`, [user.id]);
        return query.rowCount > 0 ? true : false;
    }

    /**
     * Saves/updates a playlist to the database
     * @param user_id User id belonging to the playlist
     * @param playlist Playlist to save
     */
    static async setPlaylist(user_id: string, playlist: Playlist) {
        const query = await Database.client.query(`
            INSERT INTO playlists (id, user_id, name, description, sources, filters, matched_tracks, included_tracks, excluded_tracks, log)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (id, user_id) DO UPDATE
                SET name = $11, description = $12, sources = $13, filters = $14, matched_tracks = $15, included_tracks = $16, excluded_tracks = $17, log = $18`,
            [
                playlist.id, user_id,

                playlist.name, playlist.description, playlist.sources, playlist.filters, playlist.matched_tracks, playlist.included_tracks, playlist.excluded_tracks, playlist.log,
                playlist.name, playlist.description, playlist.sources, playlist.filters, playlist.matched_tracks, playlist.included_tracks, playlist.excluded_tracks, playlist.log,
            ]);

        return query.rowCount > 0 ? true : false;
    }

    /**
     * Gets a playlist from the database
     * @param user_id User to get the playlist for
     * @param playlist_id Playlist id to get
     */
    static async getPlaylist(user_id: string, playlist_id: string): Promise<Playlist | undefined> {
        const result = await Database.client.query(`SELECT * FROM playlists WHERE id = $1 AND user_id = $2`, [playlist_id, user_id]);
        return result?.rows[0];
    }

    /**
     * Gets all playlists from the database
     */
    static async getAllPlaylists(): Promise<Playlist[]> {
        const result = await Database.client.query(`SELECT * FROM playlists`);
        return result.rowCount > 0 ? result.rows as Playlist[] : [];
    }

    /**
     * Gets all playlists from the database for a user
     * @param user_id User to get the playlists for
     */
    static async getUserPlaylists(user_id: string): Promise<Playlist[]>{
        const result = await Database.client.query(`SELECT * FROM playlists WHERE user_id = $1`, [user_id]);
        return result.rowCount > 0 ? result.rows as Playlist[] : [];
    }

    /**
     * Deletes a playlist from the database
     * @param user_id User to delete the playlist for
     * @param playlist_id Playlist id to delete
     */
    static async deletePlaylist(user_id: string, playlist_id: string) {
        const query = await Database.client.query(`DELETE FROM playlists WHERE id = $1 AND user_id = $2`, [playlist_id, user_id]);
        return query.rowCount > 0 ? true : false;
    }

    /**
     * Sets the basic information of a playlist
     * @param user_id User id
     * @param id Playlist id
     * @param name Name of the playlist
     * @param description Description of the playlist
     */
    static async setSmartPlaylistBasic(user_id: string, id: string, name: string, description: string) {
        const query = await Database.client.query(`UPDATE playlists SET name = $1, description = $2 WHERE id = $3 and user_id = $4`, [name, description, id, user_id]);

        return query.rowCount > 0 ? true : false;
    }

    /**
     * Moves a track from excluded tracks to matched tracks
     * @param user_id User id
     * @param id Playlist id
     * @param excluded_track Track to remove from the excluded tracks
     */
    static async addToMatchedTracks(user_id: string, playlist_id: string, excluded_track: string) {
        const remove = await Database.client.query(
            `UPDATE playlists SET excluded_tracks = array_remove(excluded_tracks, $1) WHERE id = $2 AND user_id = $3`, [excluded_track, playlist_id, user_id]
        );

        if (remove.rowCount > 0) {
            const add = await Database.client.query(
                `UPDATE playlists SET matched_tracks = array_prepend($1, matched_tracks) WHERE id = $2 AND user_id = $3 AND $1 <> ALL(matched_tracks)`, [excluded_track, playlist_id, user_id]
            );

            return add.rowCount > 0 ? true : false;
        } else {
            return false;
        }
    }

    /**
     * Moves a track from matched tracks to excluded tracks
     * @param user_id User id
     * @param playlist_id Playlist id
     * @param excluded_track Track to remove from the matched tracks
     */
    static async addToExcludedTracks(user_id: string, playlist_id: string, excluded_track: string) {
        const remove = await Database.client.query(
            `UPDATE playlists SET matched_tracks = array_remove(matched_tracks, $1) WHERE id = $2 AND user_id = $3`, [excluded_track, playlist_id, user_id]
        );

        if (remove.rowCount > 0) {
            const add = await Database.client.query(
                `UPDATE playlists SET excluded_tracks = array_prepend($1, excluded_tracks) WHERE id = $2 AND user_id = $3 AND $1 <> ALL(excluded_tracks)`, [excluded_track, playlist_id, user_id]
            );

            return add.rowCount > 0 ? true : false;
        } else {
            return false;
        }
    }

    static async addToIncludedTracks(user_id: string, playlist_id: string, included_track: string) {
        const remove = await Database.client.query(
            `UPDATE playlists SET included_tracks = array_prepend($1, included_tracks) WHERE id = $2 and user_id = $3`, [included_track, playlist_id, user_id]
        );

        return remove.rowCount > 0 ? true : false;
    }

    static async removeFromIncludedTracks(user_id: string, playlist_id: string, included_track: string) {
        const add = await Database.client.query(
            `UPDATE playlists SET included_tracks = array_remove(included_tracks, $1) WHERE id = $2 and user_id = $3`, [included_track, playlist_id, user_id]
        );

        return add.rowCount > 0 ? true : false;
    }
}