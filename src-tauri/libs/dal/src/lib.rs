use crate::core::helpers;
use crate::structs::server_info::ServerInfo;

pub mod structs;
mod core;


static DB_PATH: &str = "./rm.db";

pub fn init() {
    helpers::init_db(DB_PATH);
}


pub fn insert(con_info: ServerInfo) {
    let conn = sqlite::open(DB_PATH).unwrap();
    helpers::save_or_update(conn, con_info)
}


#[cfg(test)]
mod tests {
    use crate::{init, insert};
    use crate::structs::server_info::ServerInfo;

    #[test]
    fn db_init_test() {
        let init = init();
        assert_eq!(init, ());
    }

    #[test]
    fn db_save_test() {
        let info = ServerInfo::create("test".to_string(), "127.0.0.1".to_string(), 6379, None, None);
        let update = insert(info);
        assert_eq!(update, ());
    }
}
