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
import { CUser } from './types/client';

const api = express.Router();

/**
 * Logs a user in. Adds them to the database if they don't exist
 * @param {string} code The code to exchange for a refresh token from spotify
 */
api.post('/user/authorize', async (req, res) => {
    // If the data is invalid
    if (req.body?.response_type !== 'code' || req.body?.client_id !== process.env.SP_CLIENT_ID)
        return res.status(400).json({ error: "Invalid request" });

    // Convert the CodeGrantResponse to an object
    let response = await Fetch.post('https://accounts.spotify.com/api/token', {
        data: {
            grant_type: 'authorization_code',
            redirect_uri: `${process.env.DOMAIN}`,
            code: req.body.code,
        },
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(`${process.env.SP_CLIENT_ID}:${process.env.SP_CLIENT_SECRET}`).toString('base64')
        }
    });

    // We failed to get a code grant, code is invalid
    if (response.status !== 200)
        return res.status(401).json({ error: "Invalid code" })

    const spotify_response = {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in,
        refresh_token: response.data.refresh_token,
    };

    response = (await Fetch.get("/me", { headers: {
        'Authorization': `Bearer ${spotify_response.access_token}`
    }}));

    if (response.status !== 200)
        return res.status(401).json({ status: "Spotify Error", error: response.statusText });

    // Store the user in the cache
    Users.set({
        name: response.data.display_name,
        id: response.data.id,
        country: response.data.country,
        refresh_token: spotify_response.refresh_token,
        access_token: spotify_response.access_token,
        access_token_expiry: new Date(Date.now() + spotify_response.expires_in * 1000),
    })

    // Update or insert the user into the database
    Database.setUser(await Users.get(response.data.id))

    // Generate a token for the user
    const server_token = Users.generate_token({
        name: response.data.display_name,
        id: response.data.id,
        country: response.data.country,
    });

    // Send the user the data
    res.json({
        name: response.data.display_name,
        id: response.data.id,
        country: response.data.country,
        server_token: server_token,
        server_token_expiry: new Date(Date.now() + 60 * 60 * 24 * 1000).getTime(),
        spotify_token: spotify_response.access_token,
        spotify_token_expiry: new Date(Date.now() + spotify_response.expires_in * 1000).getTime(),
    } as CUser)
});

/**
 * Refreshes a user's access token
 */
api.post('/user/refresh', Users.verify_token, async (req, res) => {
    const user = await Users.get(req.user.id);
    res.json({spotify_token: user.access_token, spotify_token_expiry: user.access_token_expiry.getTime()})
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
        return res.status(400).json({ error: "Playlist is not a smart playlist" });

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
    res.status(200).json(playlist.id);
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
            return res.status(result.status).json({status: "Spotify Error", error: result.statusText})

        // Delete the playlist from the database
        Database.deletePlaylist(req.body.id, req.user.id)
        .then(() => {
            res.status(200)
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
            res.status(response.status).json({status: "Spotify Error", error: response.statusText})

        Database.setSmartPlaylistBasic(req.params.playlistid, req.user.id, data.name, data.description);
        res.status(200);
    })
})

/**
 * Removes tracks form the matched tracks list by moving them to the excluded tracks list
 * @param removed list of tracks to move to the excluded tracks list
 */
api.delete(`/playlist/:playlistid/matched-tracks`, Users.verify_token, async (req, res) => {
    if (!req.body.removed || req.body.removed instanceof Array === false)
        return res.status(400).json({status: "Invalid Request"});

    // Remove from the playlist
    for (let i = 0; req.body.removed && i < req.body.removed.length; i += 100) {
        Fetch.delete(`/playlists/${req.params.playlistid}/tracks`, {
            user: await Users.get(req.user.id),
            data: {tracks: req.body.removed.slice(i, i + 100).map((track: string) => {
                return {uri: `spotify:track:${track}`}}
            )}
        }).then(response => {
            if (response.status !== 200 && response.status !== 201) {
                res.status(response.status).json({status: "Spotify Error", error: response.statusText})
                return LOG({task: "Move matched tracks", status: "Spotify Error", error: response.statusText});
            } else {
                Snapshots.set(req.params.playlistid, req.user.id, response.data.snapshot_id)
            }
        });
    }

    // Move the tracks
    for (let trackid of req.body.removed)
        Database.addToExcludedTracks(req.params.playlistid, req.user.id, trackid);

    res.status(200);
})

/**
 * Removes tracks form the excluded tracks list by moving them to the matched tracks list
 * @param removed list of tracks to move to the matched tracks list
 */
api.delete(`/playlist/:playlistid/excluded-tracks`, Users.verify_token, async (req, res) => {
    if (!req.body.removed || req.body.removed instanceof Array === false)
        return res.status(400).json({status: "Invalid Request"});

    // Add to the playlist
    for (let i = 0; req.body.removed && i < req.body.removed.length; i += 100) {
        Fetch.post(`/playlists/${req.params.playlistid}/tracks`, {
            user: await Users.get(req.user.id),
            query: {
                uris: req.body.removed.slice(i, i + 100).map((track: string) => `spotify:track:${track}`)
            }
        }).then(response => {
            if (response.status !== 200 && response.status !== 201) {
                res.status(response.status).json({status: "Spotify Error", error: response.statusText})
                return LOG({task: "Move excluded tracks", status: "Spotify Error", error: response.statusText});
            } else {
                Snapshots.set(req.params.playlistid, req.user.id, response.data.snapshot_id)
            }
        });
    }

    // Move the tracks
    for (let trackid of req.body.removed)
        Database.addToMatchedTracks(req.params.playlistid, req.user.id, trackid);

    res.status(200);
})

/**
 * Removes tracks from the manually included list
 * @param removed list of tracks to remove from the included tracks list
 */
api.delete(`/playlist/:playlistid/included-tracks`, Users.verify_token, async (req, res) => {
    if (!req.body.removed || req.body.removed instanceof Array === false)
        return res.status(400).json({status: "Invalid Request"});

    // Update the playlist
    for (let i = 0; i < req.body.removed.length; i += 100) {
        Fetch.delete(`/playlists/${req.params.playlistid}/tracks`, {
            user: await Users.get(req.user.id),
            data: {tracks: req.body.removed.slice(i, i + 100).map((track: string) => {
                return {uri: `spotify:track:${track}`}}
            )}
        }).then(response => {
            if (response.status !== 200 && response.status !== 201) {
                res.status(response.status).json({status: "Spotify Error", error: response.statusText})
                return LOG({task: "Delete included tracks", status: "Spotify Error", error: response.statusText});
            } else {
                Snapshots.set(req.params.playlistid, req.user.id, response.data.snapshot_id)
            }
        });
    }

    // Remove the tracks
    for (let trackid of req.body.removed)
        Database.removeFromIncludedTracks(req.params.playlistid, req.user.id, trackid);

    res.status(200);
})

api.patch(`/playlist/:playlistid`, async (req, res) => {
    const result = await Filters.execute(req.params.playlistid, await Users.get(req.user.id));

    // If false, something went wrong
    if (result === false) {
        return res.status(404);
    }
    // True means the playlist is already running
    else if (result === true) {
        return res.status(304).json({
            status: "Playlist is already running",
            log: await FilterLog.get(req.params.playlistid).changed()
        });
    } else {
        return res.json(result);
    }
})

export default api;
