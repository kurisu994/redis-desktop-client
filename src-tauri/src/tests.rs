#[cfg(test)]
mod tests {
    use crate::core::manager;
    use crate::dao::db;
    use crate::dao::server::query_all;

    #[test]
    fn test_get_all() {
        let result = query_all("").unwrap();
        println!("{:?}", result);
    }

    #[test]
    fn test_db() {
        db::set_path("./db/rdc.db");
        let data = manager::all_keys_by_pattern(1, 0, "*:shop*");
        println!("{:?}", data);
    }

    #[test]
    fn test_key_value() {
        db::set_path("./db/rdc.db");
        match manager::get_value_by_key(1, 0, "erp:group:lat") {
            Ok(data) => {
                println!("{}", serde_json::to_string(&data).unwrap())
            }
            Err(err) => {
                println!("{}", err.to_string())
            }
        }
    }
}
