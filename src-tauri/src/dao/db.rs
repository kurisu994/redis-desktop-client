use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use std::path;

use dotenv::dotenv;
use std::env;

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