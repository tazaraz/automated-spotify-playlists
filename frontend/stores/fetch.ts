import User from "./user";
import FetchError from "./error";

interface FetchResponse<T> extends Response {
    data: T
}

export interface FetchOptions {
    /** Whether to try to use a user. Defaults to true */
    user?: boolean;
    /** The maximum amount of retries */
    retries?: number;
    /** The ids of the items to fetch. You may need to specify limit as well,
     * indicating how many items per API call may be requested */
    ids?: string[];
    /** If the response contains a next url. You may need to specify limit as well,
     * indicating how many items per API call may be requested */
    pagination?: boolean;
    /** Offset position if applicable. */
    offset?: number;
    /** If ids are provided, offset is set or pagination is true,
     * the limit indicates how many items per API call may be requested */
    limit?: number;
    /** The query parameters to add to the url */
    query?: {[key: string]: string | string[]};
    /** The data to send with the request */
    data?: object;
    /** What kind of method to use */
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    /** The headers to send with the request */
    headers?: {[key: string]: string};
}

/**
 * The holy fetch handler.
 * This class handles all requests to the server and spotify.
 * It handles most (who knows what might happen?) of the errors that could occur
 */
export default class Fetch {
    static user: User;
    static refreshingToken: Promise<boolean> | null;

    constructor(user: User) {
        if (!Fetch.user) Fetch.user = user;
    }

    static get<T = any>(url: string, options?: FetchOptions) {
        return Fetch.build<T>(url, { method: "GET", ...options });
    }

    static post<T = any>(url: string, options?: FetchOptions) {
        return Fetch.build<T>(url, { method: "POST", ...options });
    }

    static put<T = any>(url: string, options?: FetchOptions) {
        return Fetch.build<T>(url, { method: "PUT", ...options });
    }

    static delete<T = any>(url: string, options?: FetchOptions) {
        return Fetch.build<T>(url, { method: "DELETE", ...options });
    }

    static patch<T = any>(url: string, options?: FetchOptions) {
        return Fetch.build<T>(url, { method: "PATCH", ...options });
    }

    protected static async build<T>(url: string, options: FetchOptions = {}) {
        const offset     = options?.offset ?? undefined;
        const limit      = options?.limit ?? 50;
        const ids        = options?.ids?.sort() ?? undefined;
        const pagination = options?.pagination ?? false;
        const data       = options?.data ?? undefined;
        const user       = options?.user ?? true;
        const server     = url.startsWith("server:")
        options.headers  = options.headers ?? {}

        // If a user is provided, make sure the access token is valid
        if (user)
            await Fetch.setAccessToken(url, options);

        // Set the base domain
        if (server) {
            url = url.replace("server:", `${window.location.origin}/api`);
        } else if (url.startsWith("spotify:")) {
            url = url.replace("spotify:", "https://api.spotify.com/v1");
        } else {
            // throw new Error("Invalid url. Must start with 'server:' or 'spotify:'");
        }

        // Fetch allows the use of an init object
        const parameters: FetchOptions = { method: options.method, headers: {} };

        // If there are query init, add them to the url
        if (options?.query) {
            let query = "?"
            // Sort the queries
            const queries = Object.keys(options.query).sort();

            for (let i = 0, l = queries.length; i < l; i++) {

                // Make sure the params are sorted
                let params = options.query[queries[i]];
                // Skip if the params are empty
                if (typeof params !== "string" && params.length == 0) continue;
                if (typeof params === "string" && params === "") continue;

                params = typeof params === "string" ? params : params.sort().toString()
                query += `${queries[i]}=${params}` + (i < l - 1 ? "&" : "");
            }

            // Add the query to the url
            url += query;
        }

        // Add the headers to the init
        for (const key in options.headers)
            parameters.headers[key] = options.headers[key];

        // Storage
        let result: any = [];
        let response: any;

        if (pagination || offset != undefined) {
            // Do the first request. This will also tell us how many items there will be in total
            response = await Fetch.parseRequest(
                `${url}${options.query ? '&' : '?'}limit=${limit}&offset=${offset ?? 0}`,
                parameters,
                options
            );

            if (response.status !== 200)
                return response as FetchResponse<T>;

            // If pagination was not set, simply return the data
            if (!pagination) {
                response.data = Fetch.format(response.data);
                return response as FetchResponse<T>;
            }

            const data = response.data;
            const total = data.total;
            const requests: any = [{data: data}];

            // Do the rest of the requests in parallel
            for (let i = (offset ?? 0) + limit; i < total; i += limit) {
                requests.push(Fetch.parseRequest(
                    `${url}${options.query ? '&' : '?'}limit=${limit}&offset=${i}`,
                    parameters, options
                ));
            }

            // Wait for all requests to finish and format the data
            const responses = await Promise.all(requests);
            responses.map(response => result.push(...Fetch.format(response.data)));

            response.data = result;
            return response as FetchResponse<T>;
        }

        else if (ids) {
            // 50 often being the maximum amount of data which can be requested at once
            for (let i = 0; i < ids.length; i += limit) {
                response = (await Fetch.parseRequest(
                    `${url}${options.query ? '&' : '?'}ids=${
                        // Take only ${limit} values, exceeding max items behaves like max items
                        ids.slice(i, i + limit).toString()
                    }`,
                    parameters, options
                )).data;

                // Store data accordingly
                result.push(...Fetch.format(response));
            }

            return {data: result} as FetchResponse<T>;
        }

        else {
            if (data) {
                if (!parameters.headers['Content-Type'] && !server) {
                    parameters['body'] = (new URLSearchParams(data as any)).toString();
                    parameters.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                } else {
                    parameters['body'] = JSON.stringify(data);
                    parameters.headers['Content-Type'] = 'application/json';
                }
            }
            return await Fetch.parseRequest<T>(url, parameters, options)
        }
    }

    protected static async parseRequest<T>(url: string, parameters: any, options: FetchOptions): Promise<FetchResponse<T>> {
        // Fetch the data
        const response = await fetch(url, parameters);

        switch (response.status) {
            /**Use a retry limit for these codes */
            case 401:
            case 403:
            case 404:
            case 503:
                if (options.retries-- > 0) {
                    return await new Promise(resolve => {
                        setTimeout(async () => {
                            // Retry the request
                            resolve(await Fetch.parseRequest(url, parameters, options));
                        }, 1000)
                    });
                }

                break;

            /**Spotify had a hiccough, give it some time */
            case 429:
                if ((!options.retries || options.retries-- <= 0) && !response.headers.has("Retry-After")) {
                    FetchError.create({
                        status: 429,
                        message: "Too many requests",
                        priority: 1
                    });

                    break;
                }
            case 500:
            case 502:
            case 504:
                // Set the default timeout to 5 seconds. If "Retry-After" is set, use that instead
                let retry_after = 5000;
                if (response.headers.has("Retry-After"))
                    retry_after = parseInt(response.headers.get("Retry-After")!) * 1000;

                return await new Promise(resolve => {
                    // Retry the request
                    setTimeout(async () => resolve(await Fetch.parseRequest(url, parameters, options)), retry_after)
                });

            /** No data */
            case 204:
                (response as any).data = null;
                break;

            default:
                // Parse the data. If it fails, there is no data
                (response as any).data = await response.text();
                try {
                    (response as any).data = JSON.parse(response.data);
                } catch (_) {}
        }

        // Parse the data. If it fails, there is no data. return null
        return response as FetchResponse<T>;
    }

    /**
     * Removes any containers spotify might have wrapped the data in
     * @param data Raw spotify data
     */
    static format<T>(data: T) {
        /**We ignore everything here, as data enters as <any>, but might already be typed,
         * allowing us to maintain that typing */
        // @ts-ignore
        if (data.tracks) data = data.tracks; // @ts-ignore
        if (data.albums) data = data.albums; // @ts-ignore
        if (data.artists) data = data.artists; // @ts-ignore
        if (data.playlists) data = data.playlists; // @ts-ignore
        if (data.audio_features) data = data.audio_features; // @ts-ignore

        // If there are multiple items, get those
        if (data.items) data = data.items; // @ts-ignore

        /**Converting items in the container to a simple form */
        if (Array.isArray(data)) { // @ts-ignore
            // Tracks are nested in the data: track.track.id instead of track.id
            data = data.map((track: any) => track.track ? track.track : track);
        }

        return data;
    }

    /**
     * Middleware ensuring the access token is valid
     * @param url Url which was accessed
     * @param options Fetch options
     */
    protected static async setAccessToken(url: string, options: FetchOptions): Promise<void> {
        // If the system is refreshing the token, wait for that to finish first
        await Fetch.refreshingToken;

        // If the access token is expired, refresh it
        if (url !== "server:/user/refresh" && (Fetch.user.spotifyTokenExpired() || Fetch.user.serverTokenExpired())) {
            if (Fetch.user.serverTokenExpired()) {
                Fetch.user.logout();
                throw new Error("Server token expired");
            }

            // Refresh the token
            Fetch.refreshingToken = new Promise(async resolve => {
                const response = await Fetch.post(`server:/user/refresh`);

                // If the token is invalid, log out
                if (response.status === 401 || response.status === 406) {
                    Fetch.user.logout();

                    // Throw the appropriate error
                    if (response.status === 401)
                        throw new Error("No server token");
                    if (response.status === 406)
                        throw new Error("Invalid server token");
                }

                // Parse the response
                const { spotify_token, spotify_token_expiry } = response.data;

                // Store the new server token
                Fetch.user.setSpotifyToken(spotify_token, spotify_token_expiry);

                // Resolve the promise
                resolve(true);
            })

            // Wait for the token to be refreshed
            await Fetch.refreshingToken;
        }

        // Set the correct access token
        const token = `Bearer ${url.startsWith("server:") ? Fetch.user.info.server_token : Fetch.user.info.spotify_token}`
        options.headers!['Authorization'] = token;
    }

    static bestImage(images: any): string {
        return images ? (images as any[]).reduce((a, b) => {
            return Math.abs(500 - a.width) < Math.abs(500 - b.width) ? a : b;
        }, "").url : "/no-artwork.png";
    }
}