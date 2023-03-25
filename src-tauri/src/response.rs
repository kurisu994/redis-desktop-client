use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct Message<T>
    where T: Serialize {
    data: Option<T>,
    code: i32,
    msg: String,
}

impl<T: Serialize> Message<T> {
    /// 成功
    pub fn ok(data: T) -> Self {
        Message { data: Some(data), code: 0, msg: String::from("") }
    }
    /// 失败
    pub fn err(message: &str) -> Self {
        Message { code: -1, msg: message.to_owned(), data: None }
    }
}