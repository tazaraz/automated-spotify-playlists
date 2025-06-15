import * as jwt from "jsonwebtoken";
import Database from "../tools/database";
import { DBUser, SUser } from "../shared/types/server";
import Fetch from "../tools/fetch";
import { THROW_DEBUG_ERROR } from "../main";

export default class Users {
    private static users: {[id: string]: SUser} = {};

    /**
     * Get a user from the database or cache, and updates the access token if it is about to expire
     * @param id The id of the user to get
     */
    static async get(id: string): Promise<SUser | undefined> {
        /**If the user is not in the cache, get the user from the database
         * Or if the access token expired, get a new one */
        if (!Users.users[id] || Users.accessTokenExpired(id)) {
            // Get the user from the database or cache
            const cuser = !Users.users[id] ? await Database.getUser(id): Users.users[id];

            // The user does not exist in the database
            if (!cuser)
                return undefined;

            // Get a new access token
            const data = await Users.refreshAccessToken(cuser);

            // If the user was deleted from the database, return undefined
            if (!data)
                return undefined;

            // Store the user in the cache
            Users.users[id] = {
                ...cuser,
                access_token: data.access_token,
                access_token_expiry: new Date(Date.now() + data.expires_in * 1000),
            }
        }

        return Users.users[id];
    }

    static set(user: SUser): void {
        Users.users[user.id] = user;
    }

    /**
     * Check if the access token of a user is expired
     * @param id The id of the user to check
     */
    static accessTokenExpired(id: string): boolean {
        // Check if the access token has expired, or will expire in the next 5 minutes
        return Users.users[id].access_token_expiry.getTime() < Date.now() + 5 * 60 * 1000;
    }

    static generate_token(data: object) {
        return jwt.sign(
            data,
            (process.env.SERVER_TOKEN as string),
            { expiresIn: '1d' }
        );
    }

    static verify_token(req: any, res: any, next: any){
        // Get the authorization header
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]

        // If there is no token, send a 401
        if (token == null) return res.status(401)

        // Verify the token
        jwt.verify(token, process.env.SERVER_TOKEN as string, async (error: any, user: any) => {
            if (error) {
                return res.status(406).json({error: "Invalid token"})
            }

            // If it is valid, go to the next part of expressjs handling
            req.user = user;

            /**If the user is not in the User cache, try to renew it. if still undefined, error */
            if (await Users.get(user.id) === undefined)
                return res.status(406)

            next();
        })
    }

    private static async refreshAccessToken(user: DBUser, retry = 1) {
        // Fetch an access token
        const response = await Fetch.post('https://accounts.spotify.com/api/token', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(process.env.AP_CLIENT_ID + ':' + process.env.AP_CLIENT_SECRET).toString('base64')}`,
            },
            data: {
                grant_type: 'refresh_token',
                refresh_token: user.refresh_token,
            },
        })

        if (response.status !== 200) {
            // If the response is not 200, try again, waiting 1 second
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (retry > 0) {
                return await Users.refreshAccessToken(user, retry - 1);
            } else {
                /* The user has revoked access. Remove the user from the database
                 * This will keep the playlists in the database, but will not update them anymore */
                if (response.data?.error === 'invalid_grant') {
                    await Database.deleteUser(user);
                    return null;
                } else {
                    THROW_DEBUG_ERROR(`Could not refresh access token (status: ${response.status}): ${JSON.stringify(response.data)}`);
                }
            }
        }

        return response.data;
    }
}
