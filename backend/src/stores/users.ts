import * as jwt from "jsonwebtoken";
import Database from "../tools/database";
import { SUser } from "../types/server";

export default class Users {
    private static users: {[id: string]: SUser} = {};

    /**
     * Get a user from the database or cache, and updates the access token if it is about to expire
     * @param id The id of the user to get
     */
    static async get(id: string): Promise<SUser | undefined> {
        /* If the user is not in the cache, get the user from the database
         * Or if the access token expired, get a new one */
        if (!Users.users[id] || Users.accessTokenExpired(id)) {
            // Get the user from the database or cache
            const cuser = !Users.users[id] ? await Database.getUser(id): Users.users[id];

            // The user does not exist in the database
            if (!cuser)
                return undefined;

            // Get a new access token
            const data = await Users.refreshAccessToken(cuser.refresh_token);

            // Store the user in the cache
            Users.users[id] = {
                ...cuser,
                access_token: data.access_token,
                access_token_valid_until: new Date(Date.now() + data.expires_in * 1000),
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
        return Users.users[id].access_token_valid_until.getTime() < Date.now() + 5 * 60 * 1000;
    }

    static generate_token(data: object) {
        return jwt.sign(
            data,
            (process.env.SERVERTOKEN as string),
            { expiresIn: '1d' }
        );
    }

    static verify_token(req: any, res: any, next: any){
        // Get the authorization header
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]

        // If there is no token, send a 401
        if (token == null) return res.sendStatus(401)

        // Verify the token
        jwt.verify(token, process.env.SERVERTOKEN as string, async (error: any, user: any) => {
            if (error) {
                return res.sendStatus(406)
            }

            // If it is valid, go to the next part of expressjs handling
            req.user = user;

            /* If the user is not in the Auth class cache, try to renew it. if still undefined, error */
            if (await Users.get(user.id) === undefined)
                return res.sendStatus(406)

            next();
        })
    }

    private static async refreshAccessToken(refresh_token: string, retry = 1) {
        // Fetch an access token
        const res = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(process.env.client_id + ':' + process.env.client_secret).toString('base64')}`,
            },
            body: JSON.stringify({
                grant_type: 'refresh_token',
                refresh_token: refresh_token,
            })
        })

        // If the request failed, retry. Might be a connection error
        // if (res.status !== 200 && retry > 0) {


        return await res.json();
    }
}
