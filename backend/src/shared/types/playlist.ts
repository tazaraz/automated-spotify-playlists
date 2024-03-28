
import { FilterBoolean, FilterString, FilterValue } from "../matching";
import { FilterParserOptions } from "./descriptions";
import { Filters, Sources } from "./filters";

export interface Playlist {
    id: string | "unpublished";
    user_id: string;
    name: string;
    description: string;
    image?: string;
    sources:      PlaylistSource[];
    filters:            PlaylistStatement;
    // Track IDs which are matched and not manually excluded or included
    matched_tracks:     string[];
    // Track IDs which are excluded from the automated playlists manually
    excluded_tracks:    string[];
    // Track IDs which are included from the automated playlists manually
    included_tracks:    string[];
    logs: PlaylistLog[];
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
    value: string;
}

export interface PlaylistLog {
    /**
     * Format of '(auto) `date`-`time`'. '(auto)' is present if the playlist was auto updated.
     * Date is in the format of `dd.mm.yyyy` and time is in the format of `hh:mm` of 24 hours.
     */
    name: string;
    /**
     * Results of the sources used to create the playlist.
     */
    sources: string[];
    /**
     * Result of applying the filters to the sources.
     */
    filters: string[];
}
