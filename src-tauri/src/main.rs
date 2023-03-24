// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use dal::structs::server_info::ServerInfo;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn save(data: &str) -> String {
    let result = serde_json::from_str::<ServerInfo>(data);
    match result {
        Ok(info) => {
            dal::insert(info);
            "ok".to_string()
        }
        Err(_) => "err".to_string()
    }
}

fn init_app() {
    dal::init();
}

fn main() {
    init_app();
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet,save])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
