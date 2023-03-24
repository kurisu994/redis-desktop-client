#[cfg(test)]
mod tests {
    use diesel::RunQueryDsl;

    use crate::dao::db;
    use crate::dao::models::{NewServer, ServerInfo};
    use crate::schema::connections::dsl::connections;

    impl NewServer {
        pub fn create_simple(name: String, host: String, port: i32) -> Self {
            Self {
                name,
                host,
                port,
                username: "".to_string(),
                password: "".to_string(),
                cluster: 0,
                nodes: "".to_string(),
                security_type: 0,
                use_private_key: 0,
                ssh_username: "".to_string(),
                ssh_host: "".to_string(),
                ssh_port: 0,
                ssh_password: "".to_string(),
                private_key_path: "".to_string(),
            }
        }
    }

    pub fn all_list() {
        let sql = "SELECT id,name,host,port FROM connections order by id desc";
        let con = &mut db::establish_connection();
        let result: Vec<ServerInfo> = diesel::sql_query(sql).load(con).unwrap_or(vec![]);

        println!("{:?}", result);
    }

    pub fn inert() {
        let new_servers = vec![
            NewServer::create_simple("dev".to_string(), "127.0.0.1".to_string(), 3333),
            NewServer::create_simple("test".to_string(), "127.0.0.1".to_string(), 3334),
            NewServer::create_simple("prd".to_string(), "127.0.0.1".to_string(), 3335),
            NewServer::create_simple("dev1".to_string(), "127.0.0.2".to_string(), 4444),
            NewServer::create_simple("test1".to_string(), "127.0.0.2".to_string(), 4445),
            NewServer::create_simple("dev2".to_string(), "127.0.0.2".to_string(), 4446),
        ];
        let mut con = db::establish_connection();
        let result = diesel::insert_into(connections)
            .values(&new_servers)
            .execute(&mut con);
        match result {
            Ok(size) => { size.to_string() }
            Err(err) => { err.to_string() }
        };
    }

    #[test]
    fn test_get_all() {
        inert();
        all_list();
    }
}