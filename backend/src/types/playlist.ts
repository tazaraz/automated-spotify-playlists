import { AvailableFilters, AvailableSources } from "../available";
import { FilterBoolean, FilterCombination, FilterString, FilterValue } from "../processing/matching";

export interface Playlist {
    id:                 string;
    user_id:            string;
    name:               string;
    description:        string;
    filters:            PlaylistStatement;
    // Tracks which are matched and not manually excluded or included
    matched_tracks:     string[];
    // Tracks which are excluded from the smart playlists manually
    excluded_tracks:    string[];
    // Tracks which are included from the smart playlists manually
    included_tracks:    string[];
    track_sources:      PlaylistSource[];
    log: { sources: string[], filters: string[] };
}

export interface PlaylistStatement {
    mode: keyof typeof FilterCombination.mode;
    filters: (PlaylistCondition | PlaylistStatement)[];
}

export interface PlaylistCondition {
    // Category (e.g. "Artist")
    category:   keyof typeof AvailableFilters;
    // Filter (e.g. "Name")
    filter:     string;
    // Operation (e.g. "Contains")
    operation:  keyof typeof FilterValue.operation |
                keyof typeof FilterString.operation |
                keyof typeof FilterBoolean.operation;
    // Value entered by the user
    value:      string | [string, string];
}

export interface PlaylistSource {
    // Source of the data
    origin: keyof typeof AvailableSources;
    // Contains any extra data needed for the source
    value: string | object;
}
