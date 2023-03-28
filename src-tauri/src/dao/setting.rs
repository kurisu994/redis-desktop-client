use diesel::prelude::*;
use diesel::RunQueryDsl;

use crate::core::redis_helper::set_refresh_interval;
use crate::dao::db;
use crate::dao::models::Settings;
use crate::schema::setting::dsl::*;

///
/// 查询设置
///
/// returns: Result<Settings, String>
///
/// # Examples
///
/// ```
/// query();
/// ```
pub fn query() -> Result<Settings, String> {
    let con = &mut db::establish_connection();
    init_setting(con);
    let sql_query = diesel::sql_query(
        "select id,language,font_size,theme,refresh_interval,editor_font_size from setting limit 1",
    );
    match sql_query.get_result::<Settings>(con) {
        Ok(data) => Ok(data),
        Err(err) => Err(err.to_string()),
    }
}

///
/// 修改设置
/// # Arguments
///
/// * `data`: 设置
///
/// returns: Result<bool, String>
///
pub fn update(data: Settings) -> Result<bool, String> {
    let con = &mut db::establish_connection();
    let result = diesel::update(setting)
        .filter(id.eq(data.id))
        .set((
            language.eq(data.language),
            font_size.eq(data.font_size),
            theme.eq(data.theme),
            refresh_interval.eq(data.refresh_interval),
            editor_font_size.eq(data.editor_font_size),
        ))
        .execute(con);

    match result {
        Ok(size) => {
            set_refresh_interval(data.refresh_interval);
            Ok(size > 0)
        }
        Err(err) => Err(err.to_string()),
    }
}

///
/// 初始化设置
///
fn init_setting(con: &mut SqliteConnection) {
    let count = setting.count().get_result::<i64>(con);
    if count != Ok(1) {
        let default_setting = Settings {
            id: 1,
            language: String::from("zhCN"),
            font_size: 12,
            theme: String::from("auto"),
            refresh_interval: 10,
            editor_font_size: 12,
        };
        diesel::insert_or_ignore_into(setting)
            .values(default_setting)
            .execute(con).unwrap();
    }
}
