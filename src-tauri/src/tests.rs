#[cfg(test)]
mod tests {
    use crate::common::request::SimpleServerInfo;
    use crate::core::manager;
    use crate::dao::server::query_all;

    #[test]
    fn test_get_all() {
        let result = query_all("").unwrap();
        println!("{:?}", result);
    }

    #[test]
    fn test_db() {
        let simple = SimpleServerInfo {
            host: "127.0.0.1".to_string(),
            port: 6379,
            username: None,
            password: None,
            con_timeout: 10,
            execution_timeout: 10,
        };
        let db_key_count = manager::get_db_key_count(simple.transform_server_info()).unwrap();
        println!("db1 key count: {:?}", db_key_count);
    }
}
