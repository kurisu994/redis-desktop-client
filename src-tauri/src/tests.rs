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
        db::set_path("./db/redis-manger.db");
        let data = manager::all_keys(1, 1);
        println!("{:?}", data);
    }
}
