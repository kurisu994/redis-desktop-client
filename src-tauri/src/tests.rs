#[cfg(test)]
mod tests {
    use crate::common::cmd::test_con;
    use crate::common::request::SimpleServerInfo;
    use crate::common::response::Message;
    use crate::dao::models::NewServer;
    use crate::dao::server::{delete_by_id, query_all, save_or_update};
    use crate::dao::setting::query;

    impl NewServer {
        pub fn create_simple_by_id(id: i32, name: String, host: String, port: i32) -> Self {
            let mut ser = NewServer::create_simple(name, host, port);
            ser.id = Some(id);
            return ser;
        }

        pub fn create_simple(name: String, host: String, port: i32) -> Self {
            Self {
                id: None,
                name,
                host,
                port,
                read_only: false,
                username: None,
                password: None,
                cluster: None,
                nodes: None,
                security_type: 0,
                use_private_key: None,
                ssh_username: None,
                ssh_host: None,
                ssh_port: None,
                ssh_password: None,
                private_key_path: None,
                key_filter: "*".to_string(),
                delimiter: ":".to_string(),
                con_timeout: 10,
                execution_timeout: 10,
            }
        }
    }

    pub fn all_list() {
        let result = query_all("").unwrap();
        println!("{:?}", result);
    }

    #[test]
    fn test_get_all() {
        all_list();
    }

    #[test]
    fn test_save() {
        let server = NewServer::create_simple("dev1".to_string(), "127.0.0.1".to_string(), 14333);
        save_or_update(server).unwrap();
    }

    #[test]
    fn test_get_update() {
        let server =
            NewServer::create_simple_by_id(2, "dev12".to_string(), "127.0.0.1".to_string(), -1);
        save_or_update(server).unwrap();
    }

    #[test]
    fn test_get_delete() {
        delete_by_id(2).unwrap();
    }

    #[test]
    fn test_query_setting() {
        match query() {
            Ok(data) => {
                println!("data: {:?}", data);
            }
            Err(e) => {
                println!("err: {:?}", e);
            }
        }
    }

    #[test]
    fn test_redis_uri() {
        let res = test_con(Some(SimpleServerInfo {
            host: "127.0.0.1".to_string(),
            port: 6379,
            username: None,
            password: None,
            con_timeout: 10,
        }));
        println!("res: {:?}", res);
        assert_eq!(res, Message::ok(true));
    }
}
