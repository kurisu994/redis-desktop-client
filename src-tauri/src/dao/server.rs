use diesel::{RunQueryDsl, SqliteConnection};
use diesel::prelude::*;
use diesel::sql_types::Text;

use crate::dao::db;
use crate::dao::models::{NewServer, ServerInfo};
use crate::schema::connections::dsl::*;

///
/// 查询连接列表
/// # Arguments
///
/// * `kw`: 关键字。查询用
///
/// returns: Result<Vec<ServerInfo>, String>
///
/// # Examples
///
/// ```
/// query_all("");
/// ```
pub fn query_all(kw: &str) -> Result<Vec<ServerInfo>, String> {
    let mut key_word = String::from("%");
    key_word.push_str(kw);
    key_word.push_str("%");

    let sql_query = diesel::sql_query(
        "select \
        id,name,host,port,username,password,read_only,security_type,\
        key_filter,delimiter,con_timeout,execution_timeout \
        from connections where name like ? order by id asc",
    )
        .bind::<Text, _>(key_word);
    let con = &mut db::establish_connection();
    match sql_query.load::<ServerInfo>(con) {
        Ok(list) => Ok(list),
        Err(err) => Err(err.to_string()),
    }
}

///
/// 新增和修改连接
/// # Arguments
///
/// * `data`: 连接数据
///
/// returns: Result<bool, String>
///
pub fn save_or_update(data: NewServer) -> Result<bool, String> {
    let _port = data.port;
    if _port > 65536 || _port <= 0 {
        return Err(String::from("端口号必须在1-65536之间"));
    }
    let con = &mut db::establish_connection();
    let count = connections
        .select(id)
        .filter(port.eq(data.port))
        .filter(host.eq(&data.host))
        .load::<i32>(con)
        .unwrap_or(vec![])
        .len();
    if count > 0 {
        return Err(String::from("已存在该连接，无法重复添加"));
    }
    if let None = data.id {
        inert(data, con)
    } else {
        update(data.id.unwrap(), data, con)
    }
}

///
/// 删除连接
/// # Arguments
///
/// * `pk`: 连接id
///
/// returns: Result<bool, String>
///
pub fn delete_by_id(id_no: i32) -> Result<bool, String> {
    let con = &mut db::establish_connection();
    let result = diesel::delete(connections)
        .filter(id.eq(id_no))
        .execute(con);
    match result {
        Ok(size) => Ok(size > 0),
        Err(err) => Err(err.to_string()),
    }
}

/// 新增数据
fn inert(data: NewServer, con: &mut SqliteConnection) -> Result<bool, String> {
    let res = diesel::insert_into(connections).values(data).execute(con);

    match res {
        Ok(size) => Ok(size > 0),
        Err(err) => Err(err.to_string()),
    }
}

/// 修改数据
fn update(id_no: i32, data: NewServer, con: &mut SqliteConnection) -> Result<bool, String> {
    let result = diesel::update(connections)
        .filter(id.eq(id_no))
        .set((
            name.eq(data.name),
            host.eq(data.host),
            port.eq(data.port),
            username.eq(data.username),
            password.eq(data.password),
        ))
        .execute(con);

    match result {
        Ok(size) => Ok(size > 0),
        Err(err) => Err(err.to_string()),
    }
}
