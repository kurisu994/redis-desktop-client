use crate::dao::{server, setting};
use crate::dao::models::{NewServer, ServerInfo};
use crate::response::Message;

#[tauri::command]
pub fn all_con() -> Message<Vec<ServerInfo>> {
    match server::query_all("") {
        Ok(data) => Message::ok(data),
        Err(err) => Message::err(&err),
    }
}

#[tauri::command]
pub fn save_con(data: Option<NewServer>) -> Message<bool> {
    if let None = data {
        return Message::err("连接信息不能为空");
    }
    match server::save_or_update(data.unwrap()) {
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
pub fn query_setting() -> Message<()> {
    Message::ok(setting::query())
}
