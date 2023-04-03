#[cfg(test)]
mod tests {
    use redis::RedisResult;

    use crate::common::cmd::test_con;
    use crate::common::request::SimpleServerInfo;
    use crate::dao::models::ServerInfo;
    use crate::dao::server::query_all;
    use crate::dao::setting::query;
    use crate::core::redis_helper;
    use crate::utils::helper::parse_str;

    pub fn all_list() {
        let result = query_all("").unwrap();
        println!("{:?}", result);
    }

    fn get_db_key_count(info: ServerInfo) -> RedisResult<Vec<i32>> {
        let conn = &mut redis_helper::open_redis(info)?;

        let response: String = redis::cmd("INFO").arg("keyspace").query(conn)?;
        let db_info = response.split('\n')
            .filter(|line| line.starts_with("db"))
            .map(|line| {
                let parts: Vec<&str> = line.split(',').collect();
                let key_count = parts.iter()
                    .find(|part| part.starts_with("db"))
                    .map(|keys| {
                        parse_str::<i32>(keys, "keys=").unwrap_or(0)
                    })
                    .unwrap_or(0);
                key_count
            })
            .collect();

        Ok(db_info)
    }

    #[test]
    fn test_get_all() {
        all_list();
    }


    #[test]
    fn test_query_setting() {
        match query() {
            Ok(data) => {
                println!("data: {:?}", data);
            }
            Err(e) => {
                println!("err: {:?}", e);
            }
        }
    }

    #[test]
    fn test_redis_uri() {
        let res = test_con(Some(SimpleServerInfo {
            host: "127.0.0.1".to_string(),
            port: 6379,
            username: None,
            password: None,
            con_timeout: 10,
        }));
        println!("res: {:?}", res);
    }

    #[test]
    fn test_db() {
        let simple = SimpleServerInfo {
            host: "127.0.0.1".to_string(),
            port: 6379,
            username: None,
            password: None,
            con_timeout: 10,
        };
        let db_key_count = get_db_key_count(simple.transform_server_info()).unwrap();
        for (i, count) in db_key_count.iter().enumerate() {
            println!("Database {}: {} keys", i, count);
        }
    }

    #[test]
    fn test_dirs() {
        println!("home_dir:       {:?}", tauri::api::path::home_dir());
        println!("cache_dir:      {:?}", tauri::api::path::cache_dir());
        println!("config_dir:     {:?}", tauri::api::path::config_dir());
        println!("data_dir:       {:?}", tauri::api::path::data_dir());
        println!("data_local_dir: {:?}", tauri::api::path::local_data_dir());
        println!("executable_dir: {:?}", tauri::api::path::executable_dir());
        println!("runtime_dir:    {:?}", tauri::api::path::runtime_dir());
        println!("audio_dir:      {:?}", tauri::api::path::audio_dir());
        println!("desktop_dir:       {:?}", tauri::api::path::desktop_dir());
        println!("document_dir:      {:?}", tauri::api::path::document_dir());
        println!("download_dir:     {:?}", tauri::api::path::download_dir());
        println!("font_dir:       {:?}", tauri::api::path::font_dir());
        println!("picture_dir:    {:?}", tauri::api::path::picture_dir());
        println!("public_dir:     {:?}", tauri::api::path::public_dir());
        println!("template_dir:   {:?}", tauri::api::path::template_dir());
        println!("video_dir:      {:?}", tauri::api::path::video_dir());
    }
}
