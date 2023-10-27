import express from 'express';
import Database from './tools/database';
import Fetch from './tools/fetch';
import Filters from './processing';
import Users from './stores/users';
import MusicSources from './processing/sources';
import FilterParser from './processing/parser';
import FilterTask from './stores/filtertask';
import { Playlist } from './shared/types/playlist';
import { CUser } from './shared/types/client';
import { LOG, LOG_DEBUG } from './main';

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
            redirect_uri: `${req.get('origin')}`,
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
    .catch(error => {
        LOG_DEBUG("Failed to update user:\n" + error)
        res.status(400).json({ status: "Failed to update user", error: error })
    });

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
    try {
        res.json((await Database.getUserPlaylists(req.user.id) || []));
    } catch (error) {
        LOG_DEBUG("Failed to get playlists:\n" + error)
        res.status(400).json({ status: "Failed to get playlists", error: error });
    }
});

/**
 * Saves a smart playlist for the user
 */
api.put('/playlist', Users.verify_token, async (req, res) => {
    // Build the playlist object
    console.log(req.body)
    let playlist: Playlist;
    try {
        playlist = {
            id: req.body.id,
            user_id: req.user.id,
            // Remove newlines from the name
            name: req.body.name.replace(/\n/g,''),
            description: req.body.description,
            sources: req.body.sources,
            filters: req.body.filters,
            matched_tracks: [],
            excluded_tracks: [],
            included_tracks: [],
            log: { filters: [], sources: [] },
        };
    } catch (error) {
        LOG_DEBUG(error)
        return res.status(400).json({ error: "Invalid request" });
    }

    /**make sure that it is not creating a normal playlist */
    if (playlist.filters === undefined)
        return res.status(400).json({ error: "Playlist is not a smart playlist" });

    /**We now verify the validity of the filters and sources */
    const user = await Users.get(req.user.id)
    const task = new FilterTask(Math.random().toString())

    try {
        // Check if the sources supplied are valid
        await MusicSources.get(playlist.sources, user, task, true)
        // Check if the filters supplied are valid
        await FilterParser.process(playlist.filters, [], user, task, true);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }

    // Delete the log
    task.delete();

    /** We now update or create the playlist */
    try {
        const dbplaylist = await Database.getPlaylist(req.user.id, playlist.id);
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
    } catch (error) {
        LOG_DEBUG("Failed to save smart playlist:\n" + error)
        res.status(400).json({ status: "Failed to save smart playlist", error: error })
    }
});

/**
 * Deletes a smart playlist for the user
 */
api.delete('/playlist', Users.verify_token, async (req, res) => {
    /**Spotify does not do 'deleting', it just unfollows
     * We make sure the playlist does exist by first checking if spotify succeeds */
    Fetch.delete(`/playlists/${req.body.id}/followers`, {
        user: await Users.get(req.user.id),
        query: { playlist_id: req.body.id }
    }).then(result => {
        // If the request failed, return the error
        if (result.status !== 200)
            return res.status(result.status).json({status: "Spotify Error", error: result.statusText})

        // Delete the playlist from the database
        Database.deletePlaylist(req.user.id, req.body.id)
        .then(() => { res.sendStatus(200)})
        .catch(error => {
            LOG_DEBUG("Failed to delete smart playlist:\n" + error)
            res.status(400).json({status: "Failed to delete smart playlist", error: error})
        })
    })
});

/**
 * Runs the filters for a given playlist
 */
api.patch(`/playlist/:playlistid`, Users.verify_token, async (req, res) => {
    if (!FilterTask.exists(req.params.playlistid)) {
        // Start the execution
        Filters.execute(req.params.playlistid, await Users.get(req.user.id))
        // Wait for the log to be created
        while (!FilterTask.exists(req.params.playlistid)) await new Promise(resolve => setTimeout(resolve, 100))
        // Reply
        return res.status(201).send("Started running the playlist filters");
    } else {
        const task = await FilterTask.get(req.params.playlistid).logChange();

        if (task.finalized) {
            if (task.result.status === 200)
                res.json(task.result.playlist);
            else
                res.status(task.result.status).json(task.result.message);

            task.delete();
        } else {
            return res.status(302).json({
                status: "Playlist is already running",
                log: task.log
            });
        }
    }
})

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
            return res.status(response.status).json({status: "Spotify Error", error: response.statusText})

        Database.setSmartPlaylistBasic(req.user.id, req.params.playlistid, data.name, data.description)
        .then(() => res.sendStatus(200))
        .catch(error => {
            LOG_DEBUG("Failed to update smart playlist basic info:\n" + error)
            res.status(400).json({status: "Failed to update smart playlist basic info", error: error})
        })
    })
})

/**
 * Removes tracks form the matched tracks list by moving them to the excluded tracks list
 * @param removed list of tracks to move to the excluded tracks list
 */
api.delete(`/playlist/:playlistid/matched-tracks`, Users.verify_token, async (req, res) => {
    if (!req.body.removed || req.body.removed instanceof Array === false)
        return res.status(400).json({status: "Invalid Request"});

    // Remove any empty strings, null or undefined values
    req.body.removed = req.body.removed.filter(i => i);

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
            }
        });
    }

    // Move the tracks
    try {
        for (let trackid of req.body.removed)
            await Database.addToExcludedTracks(req.user.id, req.params.playlistid, trackid);

        res.sendStatus(200);
    } catch (error) {
        LOG_DEBUG("Failed to move tracks to excluded:\n" + error)
        res.status(400).json({status: "Failed to move tracks to excluded", error: error})
    }
})

/**
 * Removes tracks form the excluded tracks list by moving them to the matched tracks list
 * @param removed list of tracks to move to the matched tracks list
 */
api.delete(`/playlist/:playlistid/excluded-tracks`, Users.verify_token, async (req, res) => {
    if (!req.body.removed || req.body.removed instanceof Array === false)
        return res.status(400).json({status: "Invalid Request"});

    // Remove any empty strings, null or undefined values
    req.body.removed = req.body.removed.filter(i => i);

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
                LOG({task: "Move excluded tracks", status: "Spotify Error", error: response.statusText});
            }
        })
    }

    // Move the tracks
    try {
        for (let trackid of req.body.removed)
            Database.addToMatchedTracks(req.user.id, req.params.playlistid, trackid);
        res.sendStatus(200);
    } catch (error) {
        LOG_DEBUG("Failed to move tracks to matched:\n" + error)
        res.status(400).json({status: "Failed to move tracks to matched", error: error})
    }
})

/**
 * Removes tracks from the manually included list
 * @param removed list of tracks to remove from the included tracks list
 */
api.delete(`/playlist/:playlistid/included-tracks`, Users.verify_token, async (req, res) => {
    if (!req.body.removed || req.body.removed instanceof Array === false)
        return res.status(400).json({status: "Invalid Request"});

    // Remove any empty strings, null or undefined values
    req.body.removed = req.body.removed.filter(i => i);

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
            }
        });
    }

    // Remove the tracks
    try {
        for (let trackid of req.body.removed)
            Database.removeFromIncludedTracks(req.user.id, req.params.playlistid, trackid);

        res.sendStatus(200);
    } catch (error) {
        LOG_DEBUG("Failed to remove tracks from included:\n" + error)
        res.status(400).json({status: "Failed to remove tracks from included"})
    }
})

api.get('/spclient-tokens', Users.verify_token, async (req, res) => {
    const client = await Fetch.get('https://open.spotify.com/get_access_token');

    if (client.status !== 200) {
        res.status(client.status).json({status: "Spotify Error", error: client.statusText})
        return LOG(`Failed getting spotify access token. Error ${client.status}: ${client.statusText}`);
    }

    const client_token = await Fetch.post('https://clienttoken.spotify.com/v1/clienttoken', {
        data: {"client_data":{"client_id": client.data.clientId,"js_sdk_data":{}}},
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Host': 'clienttoken.spotify.com',
        }
    })

    if (client_token.status !== 200) {
        res.status(client_token.status).json({status: "Spotify Error", error: client_token.statusText})
        return LOG(`Failed getting spotify client token. Error ${client_token.status}: ${client_token.statusText}`);
    }

    res.json({
        client_token: client_token.data.granted_token.token,
        authorization: client.data.accessToken,
    })
})

export default api;
