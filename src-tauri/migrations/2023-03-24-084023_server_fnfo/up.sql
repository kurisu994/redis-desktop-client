-- Your SQL goes here
CREATE TABLE IF NOT EXISTS connections
(
    _id              INTEGER NOT null
        constraint connections_pk primary key autoincrement,
    name             TEXT    NOT null,
    host             TEXT    NOT NULL,
    port             INTEGER default 6379,
    username         TEXT,
    password         TEXT,
    cluster          INTEGER default 0,
    nodes            TEXT    default '',
    security_type    INTEGER default 0,
    use_private_key  int     default 0,
    ssh_username     TEXT,
    ssh_host         TEXT,
    ssh_port         INTEGER default 6379,
    ssh_password     TEXT,
    private_key_path TEXT,
    UNIQUE (host, port)
);

CREATE TABLE IF NOT EXISTS setting
(
    _id              INTEGER NOT null
        constraint connections_pk primary key autoincrement,
    language         TEXT,
    font_size        INTEGER default 12,
    theme            TEXT,
    refresh_interval INT     default 0,
    editor_font_size INTEGER default 12
);