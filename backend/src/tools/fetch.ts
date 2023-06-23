import Users from "../stores/users";
import { SUser } from "../types/server";

interface FetchResponse<T> extends Response {
    data: T
}

export interface FetchOptions {
    // The user supplying the access token
    user?: SUser;
    // The maximum amount of retries
    retries?: number;
    /**The ids of the items to fetch. You may need to specify limit as well,
     * indicating how many items per API call may be requested */
    ids?: string[];
    /**If the response contains a next url. You may need to specify limit as well,
     * indicating how many items per API call may be requested */
    pagination?: boolean;
    // If ids are provided or has_next is true, limit indicates how many items per API call may be requested
    limit?: number;
    // The query parameters to add to the url
    query?: {[key: string]: string | string[]};
    // The data to send with the request
    data?: object;
    // What kind of method to use
    method?: "GET" | "POST" | "PUT" | "DELETE";
    // The headers to send with the request
    headers?: {[key: string]: string};
}

export default class Fetch {
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

    protected static async build<T>(url: string, options: FetchOptions = {}) {
        const limit      = options?.limit ?? 50;
        const ids        = options?.ids ?? undefined;
        const pagination = options?.pagination ?? false;
        const data       = options?.data ?? undefined;
        options.headers  = options.headers ?? {}

        // Set the base domain
        url = url.includes('http') ? url : `https://api.spotify.com/v1${url}`;

        // Fetch allows the use of an init object
        const parameters: FetchOptions = { method: options.method, headers: {} };

        // If a user is provided, make sure the access token is valid
        if (options?.user) {
            if (Users.accessTokenExpired(options.user.id))
                options.user = await Users.get(options.user.id);

            options.headers['Authorization'] = `Bearer ${options.user.access_token}`;
        }

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

        if (pagination) {
            // Do the first request. This will also tell us how many items there will be in total
            response = (await Fetch.parseRequest(`${url}${options.query ? '&' : '?'}limit=${limit}&offset=0`, parameters, options)).data;

            const total = response.total;
            const requests: any = [{data: response}];

            // Do the rest of the requests in parallel
            for (let i = limit; i < total; i += limit) {
                requests.push(Fetch.parseRequest(
                    `${url}${options.query ? '&' : '?'}limit=${limit}&offset=${i}`,
                    parameters, options
                ));
            }

            // Wait for all requests to finish and format the data
            const responses = await Promise.all(requests);
            responses.map(response => result.push(...Fetch.format(response.data)));

            return {data: result} as FetchResponse<T>;
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
            if (parameters.headers['Content-Type'] === 'application/x-www-form-urlencoded') {
                parameters['body'] = (new URLSearchParams(data as any)).toString();
            } else {
                parameters['body'] = JSON.stringify(data);
                parameters.headers['Content-Type'] = 'application/json';
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
                if (options.retries > 0) {
                    return await new Promise(resolve => {
                        options.retries--;
                        setTimeout(async () => {
                            // Retry the request
                            resolve(await Fetch.parseRequest(url, parameters, options));
                        }, 1000)
                    });
                }

                break;

            /**Spotify had a hiccough, give it some time */
            case 429:
                if (!options.retries || options.retries-- <= 0)
                    break;
            case 500:
            case 502:
            case 504:
                // Set the default timeout to 5 seconds
                const retry_after = 5000;

                return await new Promise(resolve => {
                    setTimeout(async () => {
                        // Retry the request
                        resolve(await Fetch.parseRequest(url, parameters, options));
                    }, retry_after)
                });
        }

        (response as any).data = await response.json();
        return response as FetchResponse<T>;
    }

    protected static format(data: any) {
        /**Converting containers to a simple form */
        if (data.tracks) data = data.tracks;
        if (data.albums) data = data.albums;
        if (data.artists) data = data.artists;
        if (data.playlists) data = data.playlists;
        if (data.audio_features) data = data.audio_features;

        // If there are multiple items, get those
        if (data.items) data = data.items;

        /**Converting items in the container to a simple form */
        if (Array.isArray(data)) {
            // Tracks are nested in the data: track.track.id instead of track.id
            data = data.map((track: any) => track.track ? track.track : track);
        }

        return data;
    }
}