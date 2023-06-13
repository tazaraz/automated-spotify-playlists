import express from 'express';
import Database from './tools/database';
import Fetch from './tools/fetch';
import Filters from './processing';
import Snapshots from './stores/snapshots';
import Users from './stores/users';
import { Playlist } from './types/playlist';
import { FilterCombination } from './processing/matching';
import { MusicSources } from './processing/sources';
import FilterLog from './stores/filterlog';

const api = express.Router();

/**
 * Logs a user in. Adds them to the database if they don't exist
 * @param {string} code The code to exchange for a refresh token from spotify
 */
api.post('/user/authorize', async (req, res) => {
    const code = req.body?.code || "";
    let spotify_response: any = {},
        user: any = {};

    // If the data is invalid
    if (req.body?.response_type !== 'code' || req.body?.client_id !== process.env.SPOTIFYID)
        return res.sendStatus(406);

    try {
        // Convert the CodeGrantResponse to an object
        const data = (await Fetch.post('/api/token', {
            query: {
                grant_type: 'authorization_code',
                redirect_uri: `${process.env.HOST}/login`,
                code,
            }
        })).data;

        spotify_response = {
            access_token: data.access_token,
            expires_in: data.expires_in,
            refresh_token: data.refresh_token,
        };
    } catch (e) {
        // We failed to get a code grant, code is invalid
        return res.sendStatus(401);
    }

    user = (await Fetch.get("/me", { user })).data;

    // Store the user in the cache
    Users.set({
        name: user.display_name,
        id: user.id,
        refresh_token: spotify_response.refresh_token,
        access_token: spotify_response.access_token,
        access_token_valid_until: new Date(Date.now() + spotify_response.expires_in * 1000),
        country: user.country,
    })

    // Update or insert the user into the database
    Database.setUser(await Users.get(user.id))

    // Generate a token for the user
    const server_token = Users.generate_token({
        name: user.display_name,
        id: user.id,
        country: user.country,
    });


    // Send the user the data
    res.json({
        server_token: server_token,
        spotify_token: spotify_response.access_token,
        user: {
            name: user.display_name,
            id: user.id,
            country: user.country,
        }
    })
});

/**
 * Refreshes a user's access token
 */
api.post('/user/refresh', Users.verify_token, async (req, res) => {
    res.json({spotify_token: (await Users.get(req.user.id)).access_token})
});

/**
 * Gets smart playlists for the user
 * @returns All smart playlists for the user
 */
api.get('/playlists', Users.verify_token, async (req, res) => {
    res.json((await Database.getUserPlaylists(req.user.id) || []));
});

/**
 * Saves a smart playlist for the user
 */
api.put('/playlist', Users.verify_token, async (req, res) => {
    // Build the playlist object
    let playlist: Playlist = {
        id: req.body.id,
        user_id: req.user.id,
        // Remove newlines from the name
        name: req.body.name.replace(/\n/g,''),
        description: req.body.description,
        filters: req.body.filters,
        track_sources: req.body.track_sources,
        matched_tracks: [],
        excluded_tracks: [],
        included_tracks: req.body.included_tracks ?? [],
        log: { filters: [], sources: [] },
    };

    /* make sure that it is not creating a normal playlist */
    if (playlist.filters === undefined)
        return res.sendStatus(400);

    /* We now verify the validity of the filters and sources */
    const user = await Users.get(req.user.id)
    const log = new FilterLog(Math.random().toString())

    try {
        // Check if the filters supplied are valid
        await FilterCombination.process(playlist.filters, [], user, log, true);
        // Check if the sources supplied are valid
        await MusicSources.get(playlist.track_sources, user, log, true)
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }

    // Delete the log
    log.finalize();

    /* We now update or create the playlist */
    const dbplaylist = await Database.getPlaylist(playlist.id, req.user.id);
    if (dbplaylist) {
        // If something changed, update the playlist
        if ((playlist.description !== dbplaylist.description && playlist.description !== "") ||
            playlist.name !== dbplaylist.name
        ) {
            // Spotify replies 400 if the description is empty
            const spdata:any = { name: playlist.name };
            if (playlist.description) spdata.description = playlist.description;

            // Update Spotify
            Fetch.put(`/playlists/${playlist.id}`, { user, query: spdata });
        }

        playlist.matched_tracks = dbplaylist.matched_tracks;
        playlist.included_tracks = dbplaylist.included_tracks;
        playlist.excluded_tracks = dbplaylist.excluded_tracks;
    }

    // A new playlist, add it to spotify
    else {
        playlist.id = (await Fetch.post(`/users/${req.user.id}/playlists`, {
            user,
            data: { name: playlist.name, description: playlist.description }
        })).data.id;
    }

    // Upsert the smart playlist
    await Database.setPlaylist(req.user.id, playlist);

    // Send the response
    res.json(playlist.id);
});

/**
 * Deletes a smart playlist for the user
 */
api.delete('/playlist', Users.verify_token, async (req, res) => {
    /* Spotify does not do 'deleting', it just unfollows
     * We make sure the playlist does exist by first checking if spotify succeeds */
    Fetch.delete(`/playlists/${req.body.id}/followers`, {
        user: await Users.get(req.user.id),
        query: { playlist_id: req.body.id }
    }).then(result => {
        // If the request failed, return the error
        if (result.status !== 200)
            return res.sendStatus(result.status).json({status: "Spotify Error", error: result.statusText})

        // Delete the playlist from the database
        Database.deletePlaylist(req.body.id, req.user.id)
        .then(() => {
            res.sendStatus(200)
        })
    })
});

/**
 *                      Updates a playlists' basic data
 * @param name          Name of the playlist
 * @param description   Description of the playlist
 */
api.put(`/playlist/:playlistid/basic`, Users.verify_token, async (req, res) => {
    const data:any = { name: req.body.name };

    if (req.body.description)
        data.description = req.body.description;

    Fetch.put(`/playlists/${req.params.playlistid}/`, {
        user: await Users.get(req.user.id),
        data: data
    }).then(response => {
        if (response.status !== 200)
            res.sendStatus(response.status).json({status: "Spotify Error", error: response.statusText})

        Database.setSmartPlaylistBasic(req.params.playlistid, req.user.id, data.name, data.description);
        res.sendStatus(200);
    })
})

/**
 * Removes tracks form the matched tracks list by moving them to the excluded tracks list
 * @param deleted list of tracks to move to the excluded tracks list
 */
api.delete(`/playlist/:playlistid/matched-tracks`, Users.verify_token, async (req, res) => {
    if (!req.body.deleted || req.body.deleted instanceof Array === false)
        return res.sendStatus(400).json({status: "Invalid Request"});

    // Remove from the playlist
    for (let i = 0; req.body.deleted && i < req.body.deleted.length; i += 100) {
        Fetch.delete(`/playlists/${req.params.playlistid}/tracks`, {
            user: await Users.get(req.user.id),
            data: {tracks: req.body.deleted.slice(i, i + 100).map((track: string) => {
                return {uri: `spotify:track:${track}`}}
            )}
        }).then(response => {
            if (response.status !== 200 && response.status !== 201) {
                res.sendStatus(response.status).json({status: "Spotify Error", error: response.statusText})
                throw new Error(response.statusText);
            } else {
                Snapshots.set(req.params.playlistid, req.user.id, response.data.snapshot_id)
            }
        });
    }

    // Move the tracks
    for (let trackid of req.body.deleted)
        Database.addToExcludedTracks(req.params.playlistid, req.user.id, trackid);

    res.sendStatus(200);
})

/**
 * Removes tracks form the excluded tracks list by moving them to the matched tracks list
 * @param deleted list of tracks to move to the matched tracks list
 */
api.delete(`/playlist/:playlistid/excluded-tracks`, Users.verify_token, async (req, res) => {
    if (!req.body.deleted || req.body.deleted instanceof Array === false)
        return res.sendStatus(400).json({status: "Invalid Request"});

    // Add to the playlist
    for (let i = 0; req.body.deleted && i < req.body.deleted.length; i += 100) {
        Fetch.post(`/playlists/${req.params.playlistid}/tracks`, {
            user: await Users.get(req.user.id),
            query: {
                uris: req.body.deleted.slice(i, i + 100).map((track: string) => `spotify:track:${track}`)
            }
        }).then(response => {
            if (response.status !== 200 && response.status !== 201) {
                res.sendStatus(response.status).json({status: "Spotify Error", error: response.statusText})
                throw new Error(response.statusText);
            } else {
                Snapshots.set(req.params.playlistid, req.user.id, response.data.snapshot_id)
            }
        });
    }

    // Move the tracks
    for (let trackid of req.body.deleted)
        Database.addToMatchedTracks(req.params.playlistid, req.user.id, trackid);

    res.sendStatus(200);
})

/**
 * Removes tracks from the manually included list
 * @param deleted list of tracks to remove from the included tracks list
 */
api.delete(`/playlist/:playlistid/included-tracks`, Users.verify_token, async (req, res) => {
    if (!req.body.deleted || req.body.deleted instanceof Array === false)
        return res.sendStatus(400).json({status: "Invalid Request"});

    // Update the playlist
    for (let i = 0; i < req.body.deleted.length; i += 100) {
        Fetch.delete(`/playlists/${req.params.playlistid}/tracks`, {
            user: await Users.get(req.user.id),
            data: {tracks: req.body.deleted.slice(i, i + 100).map((track: string) => {
                return {uri: `spotify:track:${track}`}}
            )}
        }).then(response => {
            if (response.status !== 200 && response.status !== 201) {
                res.sendStatus(response.status).json({status: "Spotify Error", error: response.statusText})
                throw new Error(response.statusText);
            } else {
                Snapshots.set(req.params.playlistid, req.user.id, response.data.snapshot_id)
            }
        });
    }

    // Remove the tracks
    for (let trackid of req.body.deleted)
        Database.removeFromIncludedTracks(req.params.playlistid, req.user.id, trackid);

    res.sendStatus(200);
})

api.patch(`/playlist/:playlistid`, async (req, res) => {
    const result = await Filters.execute(req.params.playlistid, await Users.get(req.user.id));

    // If false, something went wrong
    if (result === false) {
        return res.sendStatus(404);
    }
    // True means the playlist is already running
    else if (result === true) {
        return res.sendStatus(200).json({
            status: "Playlist is already running",
            log: await FilterLog.get(req.params.playlistid).changed()
        });
    } else {
        return res.json(result);
    }
})

export default api;
