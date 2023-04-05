#[cfg(test)]
mod tests {
    use crate::common::request::SimpleServerInfo;
    use crate::core::manager;
    use crate::dao::server::query_all;

    pub fn all_list() {
        let result = query_all("").unwrap();
        println!("{:?}", result);
    }

    #[test]
    fn test_get_all() {
        all_list();
    }

    #[test]
    fn test_db() {
        let simple = SimpleServerInfo {
            host: "127.0.0.1".to_string(),
            port: 6379,
            username: None,
            password: None,
            con_timeout: 10,
            execution_timeout: 10,
        };
        let db_key_count = manager::get_db_key_count(simple.transform_server_info()).unwrap();
        println!("db key count: {:?}", db_key_count);
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
