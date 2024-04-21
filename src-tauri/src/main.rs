// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use crate::common::cmd::*;
use diesel_migrations::{embed_migrations, EmbeddedMigrations};
use tauri::{GlobalWindowEvent, Manager, Theme, WindowEvent, Wry};

mod common;
mod core;
mod dao;
mod schema;
mod tests;
mod ui;
mod utils;

const MIGRATIONS: EmbeddedMigrations = embed_migrations!("./migrations");

// 全局窗口事件
fn handle_window_event(event: GlobalWindowEvent<Wry>) {
    let window = event.window();
    let _app = window.app_handle();
    match event.event() {
        // 点击[x]发起关闭请求时
        WindowEvent::CloseRequested { api, .. } => {
            let window = window.clone();
            api.prevent_close();
            window.hide().unwrap();
        }
        // 主题发生改变时
        WindowEvent::ThemeChanged(theme) => match theme {
            Theme::Light => {
                println!("change to light theme");
            }
            Theme::Dark => {
                println!("change to dark theme");
            }
            _ => {}
        },
        _ => {}
    }
}

fn main() {
    let context = tauri::generate_context!();
    log_err!(utils::init::init_application(MIGRATIONS));
    tauri::Builder::default()
        .menu(ui::menu::AppMenu::get_menu(&context))
        .setup(|_app| Ok(()))
        .on_menu_event(ui::menu::AppMenu::on_menu_event)
        .system_tray(ui::tray::Tray::get_tray_menu())
        .on_system_tray_event(ui::tray::Tray::on_system_tray_event)
        .on_window_event(handle_window_event)
        .invoke_handler(tauri::generate_handler![
            all_server,
            save_server,
            copy_server,
            delete_server,
            test_server,
            query_setting,
            update_setting,
            read_redis_dbs,
            read_redis_status,
            read_redis_key_list,
            read_redis_key_tree,
            close_redis,
            read_redis_value,
            update_redis_key_ttl,
            delete_redis_key,
            rename_key,
        ])
        .run(context)
        .expect("error while running tauri application");
}
