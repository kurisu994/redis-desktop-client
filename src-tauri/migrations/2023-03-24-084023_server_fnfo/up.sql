-- Your SQL goes here
CREATE TABLE IF NOT EXISTS connections
(
    id              INTEGER  NOT null
        constraint connections_pk primary key autoincrement,
    name             TEXT     NOT null,
    host             TEXT     NOT NULL,
    port             INTEGER  NOT null default 6379,
    username         TEXT     NOT null default '',
    password         TEXT     NOT null default '',
    cluster          INTEGER  NOT null default 0,
    nodes            TEXT     NOT null default '',
    security_type    INTEGER  NOT null default 0,
    use_private_key  int      NOT null default 0,
    ssh_username     TEXT     NOT null default '',
    ssh_host         TEXT     NOT null default '',
    ssh_port         INTEGER  NOT null default 22,
    ssh_password     TEXT     NOT null default '',
    private_key_path TEXT     NOT null default '',
    create_date      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_date      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (host, port)
);

CREATE TABLE IF NOT EXISTS setting
(
    id              INTEGER NOT null
        constraint connections_pk primary key autoincrement,
    language         TEXT    NOT null,
    font_size        INTEGER NOT null default 12,
    theme            TEXT    NOT null,
    refresh_interval INT     NOT null default 0,
    editor_font_size INTEGER NOT null default 12
);