use std::str::FromStr;

/// parse the string
///
/// # Arguments
///
/// * `target`: string to parse
/// * `key`:  parse key
///
/// returns: Option<T>
///
/// # Examples
///
/// ```
/// let data = parse_str::<usize>("xxx=123123;","xxx=", None);
///  assert_eq!(data.unwrap(), 123123);
/// ```
pub fn parse_str<T: FromStr>(target: &str, key: &str, split: Option<&str>) -> Option<T> {
    target.find(key).and_then(|idx| {
        let idx = idx + key.len();
        let value = &target[idx..];
        match value.split(split.unwrap_or(";")).nth(0) {
            Some(value) => value.trim().parse(),
            None => value.trim().parse(),
        }
        .ok()
    })
}

#[macro_export]
macro_rules! error {
    ($result: expr) => {
        log::error!(target: "app", "{}", $result);
    };
}

#[macro_export]
macro_rules! log_err {
    ($result: expr) => {
        if let Err(err) = $result {
            log::error!(target: "app", "{err}");
        }
    };

    ($result: expr, $err_str: expr) => {
        if let Err(_) = $result {
            log::error!(target: "app", "{}", $err_str);
        }
    };
}

/// transform the anyhow error to String
#[macro_export]
macro_rules! wrap_err {
    ($stat: expr) => {
        match $stat {
            Ok(a) => Ok(a),
            Err(err) => {
                log::error!(target: "app", "{}", err.to_string());
                Err(format!("{}", err.to_string()))
            }
        }
    };
}

/// return the string literal error
#[macro_export]
macro_rules! ret_err {
    ($str: expr) => {
        return Err($str.into())
    };
}

#[test]
fn test_parse_value() {
    let test_1 = "db0:keys=7,expires=5,avg_ttl=10";
    let test_2 = "attachment; filename=config.yaml";

    assert_eq!(parse_str::<usize>(test_1, "keys=", None).unwrap(), 7);
    assert_eq!(parse_str::<usize>(test_1, "expires=", None).unwrap(), 5);
    assert_eq!(parse_str::<usize>(test_1, "avg_ttl=", None).unwrap(), 10);
    assert_eq!(
        parse_str::<String>(test_2, "filename=", None).unwrap(),
        format!("config.yaml")
    );

    assert_eq!(parse_str::<usize>(test_1, "aaa=", None), None);
    assert_eq!(parse_str::<usize>(test_1, "upload1=", None), None);
    assert_eq!(parse_str::<usize>(test_1, "expire1=", None), None);
    assert_eq!(parse_str::<usize>(test_2, "attachment=", None), None);
}
