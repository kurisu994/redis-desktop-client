// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use serde::Serialize;
use tauri::{GlobalWindowEvent, Manager, Theme, WindowEvent, Wry};

use crate::dao::db;

mod dao;
mod ui;
mod cmd;
mod tests;
pub mod schema;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("./migrations");

#[derive(Debug, Clone, Serialize)]
pub enum ThemeType {
    AUTO,
    LIGHT,
    DARK,
}

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
        WindowEvent::ThemeChanged(theme) => {
            match theme {
                Theme::Light => {}
                Theme::Dark => {}
                _ => {}
            }
        }
        _ => {}
    }
}


fn main() {
    let context = tauri::generate_context!();
    let mut connection = db::establish_connection();
    connection
        .run_pending_migrations(MIGRATIONS)
        .expect("Error migrating");

    tauri::Builder::default()
        .menu(ui::menu::AppMenu::get_menu(&context))
        .setup(|_app| {
            Ok(())
        })
        .on_menu_event(ui::menu::AppMenu::on_menu_event)
        .system_tray(ui::tray::Tray::get_tray_menu())
        .on_system_tray_event(ui::tray::Tray::on_system_tray_event)
        .on_window_event(handle_window_event)
        .invoke_handler(tauri::generate_handler![cmd::greet,cmd::save,cmd::query_all])
        .run(context)
        .expect("error while running tauri application");
}
