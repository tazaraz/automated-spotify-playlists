import * as jwt from "jsonwebtoken";
import Database from "../tools/database";
import { SUser } from "../types/server";
import Fetch from "../tools/fetch";

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

            /* If the user is not in the User cache, try to renew it. if still undefined, error */
            if (await Users.get(user.id) === undefined)
                return res.status(406)

            next();
        })
    }

    private static async refreshAccessToken(refresh_token: string, retry = 1) {
        // Fetch an access token
        const response = await Fetch.post('https://accounts.spotify.com/api/token', {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(process.env.SP_CLIENT_ID + ':' + process.env.SP_CLIENT_SECRET).toString('base64')}`,
            },
            data: {
                grant_type: 'refresh_token',
                refresh_token,
            },
        })

        if (response.status !== 200) {
            // If the response is not 200, try again, waiting 1 second
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (retry > 0) {
                return await Users.refreshAccessToken(refresh_token, retry - 1);
            } else {
                throw new Error("Could not refresh access token");
            }
        }

        return response.data;
    }
}
