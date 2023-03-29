-- Your SQL goes here
CREATE TABLE IF NOT EXISTS connections
(
    id                INTEGER  NOT null
        constraint connections_pk primary key autoincrement,
    name              TEXT     NOT null,
    host              TEXT     NOT NULL,
    port              INTEGER  NOT null default 6379,
    read_only         BOOLEAN  NOT NULL,
    username          TEXT     null,
    password          TEXT     null,
    cluster           INTEGER  NULL,
    nodes             TEXT     null,
    security_type     INTEGER  not null,
    use_private_key   INTEGER  null,
    ssh_username      TEXT     null,
    ssh_host          TEXT     null,
    ssh_port          INTEGER  null,
    ssh_password      TEXT     null,
    private_key_path  TEXT     null,
    key_filter        TEXT     NOT null default '*',
    delimiter         TEXT     NOT null default ':',
    con_timeout       INTEGER  NOT null default 10,
    execution_timeout INTEGER  NOT null default 10,
    create_date       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_date       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (host, port)
);

CREATE TABLE IF NOT EXISTS setting
(
    id               INTEGER NOT null
        constraint connections_pk primary key,
    language         TEXT    NOT null,
    font_size        INTEGER NOT null default 12,
    theme            TEXT    NOT null,
    refresh_interval INTEGER NOT null default 10,
    editor_font_size INTEGER NOT null default 12
);