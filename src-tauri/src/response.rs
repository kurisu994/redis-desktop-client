use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct Message<T>
where
    T: Serialize,
{
    data: Option<T>,
    code: i32,
    success: bool,
    msg: String,
}

impl<T: Serialize> Message<T> {
    /// 成功
    pub fn ok(data: T) -> Self {
        Message {
            data: Some(data),
            code: 0,
            success: true,
            msg: String::from(""),
        }
    }
    /// 失败
    pub fn err(message: &str) -> Self {
        Message {
            data: None,
            code: -1,
            success: true,
            msg: message.to_owned(),
        }
    }
}
