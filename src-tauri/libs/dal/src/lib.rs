mod structs;

pub fn add(left: usize, right: usize) -> usize {
    left + right
}

pub fn open_sql() {
    let connection = sqlite::open(":memory:").unwrap();
    let query = "
    CREATE TABLE users (name TEXT, age INTEGER);
    INSERT INTO users VALUES ('Alice', 42);
    INSERT INTO users VALUES ('Bob', 69);
";
    connection.execute(query).unwrap();
}



#[cfg(test)]
mod tests {
    use crate::structs::server_info::ServerInfo;
    use super::*;

    #[test]
    fn it_works() {
        let info = ServerInfo::default();
        println!("{:?}", info);
        let result = add(2, 2);
        assert_eq!(result, 4);
    }
}
