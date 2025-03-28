CREATE TABLE secrets (
    user_id TEXT PRIMARY KEY,
    secret TEXT NOT NULL
);

CREATE TABLE settings (
    user_id TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    written INTEGER NOT NULL
);
