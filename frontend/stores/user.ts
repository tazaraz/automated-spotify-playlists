import { Store, Pinia } from "pinia-class-component";
import { CUser } from "~/../backend/src/shared/types/client";
import Fetch from "./fetch";

@Store
/**
 * Stores information about the user
 */
export default class User extends Pinia {
    info: CUser | undefined;

    getCodeGrant(client_id: string){
        /**
         * Redirect the user to the spotify authorization page
         */
        window.location.href = "https://accounts.spotify.com/authorize" +
            `?client_id=${client_id}` +
            `&response_type=code` +
            `&redirect_uri=${window.location.origin}` +
            `&state=` +
            `&scope=${[
                "playlist-modify-public",
                "playlist-modify-private",
                "playlist-read-private",
                "playlist-read-collaborative",
                "user-read-private",
                "user-follow-read",
                "user-library-read",
                // Frontend only
                "user-read-currently-playing"
            ].join(" ")}`;
    }

    async getTokens(client_id: string, code: string){
        // Get a spotify and server token
        const response = await Fetch.post("server:/user/authorize", { data: {
            client_id:      client_id,
            response_type:  "code",
            code
        }, user: false})

        if (response.status === 400)
            return { errorMessage: "Missing authorization code" }
        else if (response.status === 401)
            return { errorMessage: "Invalid authorization code" }
        else {
            const user = response.data as CUser;

            // Store the user in the local storage
            localStorage.setItem("u", JSON.stringify({
                id: user.id,
                name: user.name,
                country: user.country,
            }))

            // Store the tokens in the local storage
            localStorage.setItem("e", JSON.stringify({t: user.server_token, e: user.server_token_expiry}))
            localStorage.setItem("p", JSON.stringify({p: user.spotify_token, e: user.spotify_token_expiry}))

            // Load the credentials
            this.loadCredentials();
            return ;
        }
    }

    login() {
        localStorage.setItem("o", window.location.pathname);
        this.getCodeGrant(useRuntimeConfig().public.SP_CLIENT_ID)
    }

    finishLogin() {
        navigateTo(localStorage.getItem("o") || "/");
        localStorage.removeItem("o");
    }

    dataExists() {
        return localStorage.getItem("u") !== null;
    }

    /**
     * Loads the information about the user and the tokens from the local storage
     */
    loadCredentials() {
        // If the user is not logged in, redirect them to the login page
        if (!this.dataExists())
            return false;

        // If the user is logged in
        if (this.info)
            return true;

        // Store the user in the store
        const u = JSON.parse(localStorage.getItem("u")!);
        const e = JSON.parse(localStorage.getItem("e")!);
        const p = JSON.parse(localStorage.getItem("p")!);
        this.info = {
            id: u.id,
            name: u.name,
            country: u.country,

            server_token: e.t,
            server_token_expiry: e.e,

            spotify_token: p.p,
            spotify_token_expiry: p.e
        }

        // Create a new fetch instance
        new Fetch(this);
        return true;
    }

    /**
     * Logs the user out by clearing the local storage
     */
    logout() {
        // Delete the cookies as well
        localStorage.removeItem("u")
        localStorage.removeItem("e")
        localStorage.removeItem("p")
        this.info = undefined;

        return true;
    }

    setSpotifyToken(token: string, expiry: number) {
        this.info!.spotify_token = token;
        this.info!.spotify_token_expiry = expiry;
        localStorage.setItem("p", JSON.stringify({p: token, e: expiry}));
    }

    spotifyTokenExpired() {
        const p = JSON.parse(localStorage.getItem("p") || '{"e":0}' );
        return p.e < Date.now() + 5 * 60 * 1000;
    }

    serverTokenExpired() {
        const e = JSON.parse(localStorage.getItem("e") || '{"e":0}' );
        return e.e < Date.now();
    }
}