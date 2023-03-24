use crate::dao::db;
use crate::dao::models::ServerInfo;

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn save(_data: &str) -> String {
    format!("Hello! You've been greeted from Rust!")
}

#[tauri::command]
pub fn query_all() -> Vec<ServerInfo> {
    db::query_all("")
}
