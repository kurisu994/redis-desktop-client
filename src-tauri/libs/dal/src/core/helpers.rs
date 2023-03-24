use sqlite::{Connection, Value};

use crate::structs::server_info::ServerInfo;

///
/// 初始化数据库
/// 并生成相关表
///
/// # Arguments
///
/// * `db_name`:  数据库地址
///
/// returns: ()
///
/// # Examples
///
/// ```
/// init_db("test.db");
/// ```
pub fn init_db(db_name: &str) -> () {
    let connection = sqlite::open(db_name).unwrap();
    let con_table_ddl = "CREATE TABLE IF NOT EXISTS connections (
                _id              INTEGER constraint connections_pk primary key autoincrement,
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
        );
    create unique index connections_host_port_uindex
    on connections (host, port)";
    connection.execute(con_table_ddl).unwrap();
}

pub fn save_or_update(con: Connection, info: ServerInfo) {
    let sql = "INSERT INTO connections (
                     name, host, port)
                     values (:name, :host, :port)";

    let mut statement = con.prepare(sql).unwrap();
    statement.bind_iter::<_, (_, Value)>([
        (":name", info.name.into()),
        (":host", info.host.into()),
        (":port", (info.port as i64).into()),
    ]).unwrap();

    statement.next().unwrap();
}