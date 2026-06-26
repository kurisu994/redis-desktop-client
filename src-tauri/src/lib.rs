mod commands;
mod config;
mod redis;

use config::ssh_known_hosts::{SshKnownHostsStore, SshTofuManager};
use config::store::ConnectionStore;
use redis::client::RedisClientManager;
use std::sync::Arc;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 初始化自动更新插件（仅桌面平台）
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            // 初始化连接存储（加密密钥 + 持久化目录）
            let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
            let store = ConnectionStore::new(app_data_dir.clone())
                .map_err(|e| format!("初始化连接存储失败: {e}"))?;
            let master_key = store.master_key();
            app.manage(store);

            // 初始化 SSH known_hosts 存储（复用同一 master-key）
            let known_hosts_store = Arc::new(
                SshKnownHostsStore::new(app_data_dir, master_key)
                    .map_err(|e| format!("初始化 SSH known_hosts 存储失败: {e}"))?,
            );
            app.manage(known_hosts_store);

            // 初始化 SSH TOFU 决策管理器
            app.manage(Arc::new(SshTofuManager::new()));

            // 初始化 Redis 连接池管理器
            app.manage(RedisClientManager::new());

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::connection::test_connection,
            commands::connection::save_connection,
            commands::connection::delete_connection,
            commands::connection::list_connections,
            commands::connection::connect_redis,
            commands::connection::disconnect_redis,
            commands::connection::reorder_connections,
            commands::ssh::ssh_tofu_decide,
            commands::ssh::list_ssh_known_hosts,
            commands::ssh::remove_ssh_known_host,
            // Key 浏览与管理
            commands::keys::scan_keys,
            commands::keys::get_db_info,
            commands::keys::select_database,
            commands::keys::get_key_info,
            commands::keys::delete_keys,
            commands::keys::rename_key,
            commands::keys::set_key_ttl,
            commands::keys::copy_key,
            // 值操作
            commands::values::get_string_value,
            commands::values::get_string_value_partial,
            commands::values::get_hash_value,
            commands::values::get_list_value,
            commands::values::get_set_value,
            commands::values::get_zset_value,
            commands::values::get_stream_value,
            commands::values::set_string_value,
            commands::values::set_hash_field,
            commands::values::delete_hash_field,
            commands::values::add_list_element,
            commands::values::set_list_element,
            commands::values::delete_list_element,
            commands::values::add_set_member,
            commands::values::delete_set_member,
            commands::values::add_zset_member,
            commands::values::delete_zset_member,
            commands::values::add_stream_entry,
            commands::values::delete_stream_entry,
            commands::values::create_key,
            commands::values::get_json_value,
            commands::values::set_json_value,
            // 导入导出
            commands::export::export_connections,
            commands::export::import_connections,
            // CLI 命令执行
            commands::cli::execute_command,
            // 服务器信息与慢查询
            commands::server::get_server_info,
            commands::server::get_slowlog,
            commands::server::reset_slowlog,
            commands::server::set_slowlog_threshold,
            commands::server::start_monitor,
            commands::server::stop_monitor,
            // Pub/Sub
            commands::pubsub::publish_message,
            commands::pubsub::subscribe_channels,
            commands::pubsub::unsubscribe_channels,
            // Key 数据导入导出
            commands::data::export_keys,
            commands::data::import_keys,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
