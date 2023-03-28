use crate::dao::{server, setting};
use crate::dao::models::{NewServer, ServerInfo, Settings};
use crate::response::Message;

#[tauri::command]
pub fn all_con() -> Message<Vec<ServerInfo>> {
    match server::query_all("") {
        Ok(data) => Message::ok(data),
        Err(err) => Message::err(&err),
    }
}

#[tauri::command(rename_all = "snake_case")]
pub fn save_con(server: Option<NewServer>) -> Message<bool> {
    println!("{:?}", server);
    if let None = server {
        return Message::err("连接信息不能为空");
    }
    match server::save_or_update(server.unwrap()) {
        Ok(data) => Message::ok(data),
        Err(err) => Message::err(&err),
    }
}

#[tauri::command]
pub fn delete_con(id: i32) -> Message<bool> {
    match server::delete_by_id(id) {
        Ok(data) => Message::ok(data),
        Err(err) => Message::err(&err),
    }
}

#[tauri::command]
pub fn query_setting() -> Message<Settings> {
    match setting::query() {
        Ok(data) => Message::ok(data),
        Err(err) => Message::err(&err),
    }
}

#[tauri::command]
pub fn update_setting(settings: Option<Settings>) -> Message<bool> {
    println!("{:?}", settings);
    if let None = settings {
        return Message::err("设置信息不能为空");
    }
    match setting::update(settings.unwrap()) {
        Ok(data) => Message::ok(data),
        Err(err) => Message::err(&err),
    }
}

#[tauri::command]
pub fn read_redis() -> () {}
