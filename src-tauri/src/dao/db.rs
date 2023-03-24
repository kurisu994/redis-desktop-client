use std::env;
use std::path;

use diesel::prelude::*;
use diesel::sql_types::Text;
use diesel::sqlite::SqliteConnection;
use dotenv::dotenv;

use crate::dao::models::ServerInfo;

pub fn establish_connection() -> SqliteConnection {
    dotenv().ok();

    let _env = env::var("RM_ENV");

    match _env {
        Ok(_env) => {
            let database_url = &env::var("DATABASE_URL").unwrap();

            SqliteConnection::establish(&database_url)
                .expect(&format!("Error connecting to {}", &database_url))
        }
        Err(_) => {
            println!("no RM_ENV");

            let database_url = path::Path::new(&tauri::api::path::home_dir().unwrap())
                .join(".RedisManger")
                .join("redis_manger.db");

            let database_url = database_url.to_str().clone().unwrap();

            SqliteConnection::establish(&database_url)
                .expect(&format!("Error connecting to {}", &database_url))
        }
    }
}
/// 查询全部连接
pub fn query_all(kw: &str) -> Vec<ServerInfo> {
    let sql_query = diesel::sql_query("select id,name,host,port from connections where name like %?% order by id asc")
        .bind::<Text, _>(kw);
    let con = &mut establish_connection();
    match sql_query.load::<ServerInfo>(con) {
        Ok(list) => { list }
        Err(_) => { vec![] }
    }
}