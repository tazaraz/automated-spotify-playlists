import { Store, Pinia } from "pinia-class-component";
import type { CUser } from "~/../backend/src/shared/types/client";
import Fetch from "~/composables/fetch";

@Store
/**
 * Stores information about the user
 */
export default class User extends Pinia {
    info: CUser | undefined;
    static triedRefreshingToken = false;

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
                "user-top-read",
                "user-read-recently-played",
                // Frontend only
                "user-read-currently-playing"
            ].join(" ")}`;
    }

    async parseCodeGrant(code: string) {
        window.history.pushState({}, document.title, "/");

        // Request tokens
        const error = await this.getTokens(
            useRuntimeConfig().public.AP_CLIENT_ID,
            code as string
        );

        if (!error) {
            navigateTo(localStorage.getItem("o") || "/");

            localStorage.removeItem("o");
            // Successfully logged in, so we set the flag that we have not tried to refresh the token
            localStorage.setItem("rs", "0");
            User.triedRefreshingToken = localStorage.getItem("rs") === "1";
            return true;
        }

        return false;
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

            // Store the info that we have not successfully tried relogging in
            localStorage.setItem("rs", "0");

            // Load the credentials
            this.loadCredentials();
            return;
        }
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

        // Get whether we have tried to refresh the token
        User.triedRefreshingToken = localStorage.getItem("rs") === "1";

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
     * Redirects the user to the spotify authorization page. Stores the current path in local storage
     * so that we can redirect the user back to it after they have logged in.
     */
    login() {
        localStorage.setItem("o", window.location.pathname);
        this.getCodeGrant(useRuntimeConfig().public.AP_CLIENT_ID)
    }

    /**
     * If the server token is expired, automatically retry to log in
     */
    relogin() {
        // If we have already tried to refresh the token, do not try again
        if (User.triedRefreshingToken)
            return false;

        // Set the flag that we have tried to refresh the token
        localStorage.setItem("rs", "1");
        User.triedRefreshingToken = localStorage.getItem("rs") === "1";

        this.logout();
        this.login()

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
        localStorage.removeItem("rs");
        localStorage.removeItem("o");
        this.info = undefined;

        return true;
    }

    dataExists() {
        return localStorage.getItem("u") !== null;
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