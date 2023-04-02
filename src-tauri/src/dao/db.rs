use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use tauri::api::private::OnceCell;

static DB_PATH: OnceCell<String> = OnceCell::new();

pub fn set_path(path: &str) {
    DB_PATH.get_or_init(|| { path.to_string() });
}

pub fn establish_connection() -> SqliteConnection {
    SqliteConnection::establish(DB_PATH.get().unwrap()).unwrap()
}