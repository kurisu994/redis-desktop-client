use crate::common::request::SimpleServerInfo;
use crate::common::response::Message;
use crate::dao::{server, setting};
use crate::dao::models::{NewServer, ServerInfo, Settings};
use crate::redis::redis_helper::test_server_info;

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
pub fn test_con(info: Option<SimpleServerInfo>) -> Message<bool> {
    if let None = info {
        return Message::err("连接信息不能为空");
    }
    match test_server_info(info.unwrap().transform_server_info()) {
        Ok(data) => Message::ok(data),
        Err(err) => Message::err(&err.to_string()),
    }
}

#[tauri::command]
pub fn read_redis() -> () {}
