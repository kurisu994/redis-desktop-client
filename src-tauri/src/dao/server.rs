use diesel::{RunQueryDsl, SqliteConnection};
use diesel::prelude::*;
use diesel::sql_types::{Integer, Text};

use crate::dao::db;
use crate::dao::models::{NewServer, ServerInfo};
use crate::schema::connections::dsl as con_dsl;

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
pub fn query_all(kw: &str) -> QueryResult<Vec<ServerInfo>> {
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
    sql_query.load::<ServerInfo>(con)
}

///
/// 根据id查询连接信息
/// # Arguments 
///
/// * `server_id`: 主键id
///
/// returns: Result<ServerInfo, String> 
///
/// # Examples 
///
/// ```
/// query_by_id(1)
/// ```
pub fn query_by_id(server_id: i32) -> Result<ServerInfo, String> {
    let sql_query = diesel::sql_query(
        "select \
        id,name,host,port,username,password,read_only,security_type,\
        key_filter,delimiter,con_timeout,execution_timeout \
        from connections where id=?",
    ).bind::<Integer, _>(server_id);

    let con = &mut db::establish_connection();
    match sql_query.get_result::<ServerInfo>(con) {
        Ok(data) => Ok(data),
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
pub fn save_or_update(data: NewServer) -> QueryResult<usize> {
    let con = &mut db::establish_connection();
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
pub fn delete_by_id(id_no: i32) -> QueryResult<usize> {
    let con = &mut db::establish_connection();
    diesel::delete(con_dsl::connections)
        .filter(con_dsl::id.eq(id_no))
        .execute(con)
}

/// 新增数据
fn inert(data: NewServer, con: &mut SqliteConnection) -> QueryResult<usize> {
    diesel::insert_into(con_dsl::connections).values(data).execute(con)
}

/// 修改数据
fn update(id_no: i32, data: NewServer, con: &mut SqliteConnection) -> QueryResult<usize> {
    diesel::update(con_dsl::connections)
        .filter(con_dsl::id.eq(id_no))
        .set((
            con_dsl::name.eq(data.name),
            con_dsl::host.eq(data.host),
            con_dsl::port.eq(data.port),
            con_dsl::read_only.eq(data.read_only),
            con_dsl::username.eq(data.username),
            con_dsl::password.eq(data.password),
            con_dsl::security_type.eq(data.security_type),
            con_dsl::key_filter.eq(data.key_filter),
            con_dsl::delimiter.eq(data.delimiter),
            con_dsl::con_timeout.eq(data.con_timeout),
            con_dsl::execution_timeout.eq(data.execution_timeout),
        ))
        .execute(con)
}
