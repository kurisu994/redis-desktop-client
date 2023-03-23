use sqlite::{Connection, Value};

use crate::structs::server_info::ServerInfo;

mod structs;

pub fn add(left: usize, right: usize) -> usize {
    left + right
}

pub fn open_sql() -> Connection {
    let connection = sqlite::open("connections.db").unwrap();
    let sql = "CREATE TABLE IF NOT EXISTS connections (
                _id              INTEGER    primary key AUTOINCREMENT,
                name             TEXT    not null,
                host             TEXT    NOT NULL,
                port             INTEGER default 6379,
                username         TEXT    ,
                password         TEXT    ,
                cluster          INT     default 0,
                nodes            TEXT    default '',
                security_type    INT     default 0,
                use_private_key  INT     default 0,
                ssh_username     TEXT    ,
                ssh_host         TEXT    ,
                ssh_port         INTEGER default 6379,
                ssh_password     TEXT    ,
                private_key_path TEXT
        )";
    connection.execute(sql).unwrap();
    connection
}

pub fn save_sql(con: Connection, info: ServerInfo) {
    let sql = "INSERT INTO connections (
                     name, host, port)
                     values (:name, :host, :port)";
    let mut statement = con.prepare(sql).unwrap();
    statement.bind::<&[(_, Value)]>(&[
        (":name", info.name.into()),
        (":host", info.host.into()),
        (":port", (info.port as i64).into()),
    ][..]).unwrap();
    statement.next().unwrap();
}


#[cfg(test)]
mod tests {
    use crate::structs::server_info::ServerInfo;

    use super::*;

    #[test]
    fn it_works() {
        let conn = open_sql();
        let info = ServerInfo::create("test".to_string(), "127.0.0.1".to_string(), 6379, None, None);

        save_sql(conn, info);
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
