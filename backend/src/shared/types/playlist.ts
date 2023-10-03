import { FilterBoolean, FilterString, FilterValue } from "../processing/matching";
import { FilterParserOptions } from "../types/filters";
import { Filters, Sources } from "./filters";

export interface Playlist {
    id: string;
    user_id: string;
    name: string;
    description: string;
    image?: string;
    track_sources:      PlaylistSource[];
    filters:            PlaylistStatement;
    // Track IDs which are matched and not manually excluded or included
    matched_tracks:     string[];
    // Track IDs which are excluded from the smart playlists manually
    excluded_tracks:    string[];
    // Track IDs which are included from the smart playlists manually
    included_tracks:    string[];
    log: { sources: string[], filters: string[] };
}

export interface PlaylistStatement {
    mode: keyof typeof FilterParserOptions;
    filters: (PlaylistCondition | PlaylistStatement)[];
}

export interface PlaylistCondition {
    // Category (e.g. "Artist")
    category:   keyof typeof Filters;
    // Filter (e.g. "Name")
    filter:     string;
    // Operation (e.g. "Contains")
    operation:  keyof typeof FilterValue.operation |
                keyof typeof FilterString.operation |
                keyof typeof FilterBoolean.operation;
    // Value entered by the user
    value:      string;
}

export interface PlaylistSource {
    // Source of the data
    origin: keyof typeof Sources;
    // Contains any extra data needed for the source
    value: string | typeof Sources['Recommendations']['value'];
}
