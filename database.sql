CREATE TABLE users (
    id                          TEXT            PRIMARY KEY,
    name                        TEXT            NOT NULL,
    -- Used by certain endpoints
    country                     TEXT            NOT NULL,
    -- Only thing which cannot leak
    refresh_token               TEXT            NOT NULL,
    created_at                  timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE playlists (
    id                  TEXT            NOT NULL,
    user_id             TEXT            NOT NULL,
    name                TEXT            NOT NULL,
    description         TEXT,
    -- Contains the filters
    filters             JSONB            NOT NULL,
    -- Contains the sources
    track_sources       JSONB[]          NOT NULL,
    -- Tracks which are matched by the filters
    matched_tracks      TEXT[]          NOT NULL,
    -- Tracks which manually included by the user
    included_tracks     TEXT[]          NOT NULL,
    -- Tracks which manually are excluded by the user
    excluded_tracks     TEXT[]          NOT NULL,
    -- Shows the output of each step in the source and filtering process
    log                 JSON            NOT NULL,
    PRIMARY KEY(id, user_id)
);