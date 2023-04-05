use diesel::prelude::*;
use diesel::RunQueryDsl;

use crate::common::enums::{IEnum, Theme};
use crate::core::manager::set_refresh_interval;
use crate::dao::db;
use crate::dao::models::Settings;
use crate::schema::setting::dsl as setting_dsl;

///
/// 查询设置
///
/// returns: Result<Settings, String>
///
/// # Examples
///
pub fn query() -> QueryResult<Settings> {
    let con = &mut db::establish_connection();
    let sql_query = diesel::sql_query(
        "select id,language,font_size,theme,refresh_interval,editor_font_size from setting limit 1",
    );
    sql_query.get_result::<Settings>(con)
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
    let result = diesel::update(setting_dsl::setting)
        .filter(setting_dsl::id.eq(data.id))
        .set((
            setting_dsl::language.eq(data.language),
            setting_dsl::font_size.eq(data.font_size),
            setting_dsl::theme.eq(data.theme),
            setting_dsl::refresh_interval.eq(data.refresh_interval),
            setting_dsl::editor_font_size.eq(data.editor_font_size),
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

/// 初始化设置信息
///
/// # Arguments
///
/// * `con`: 数据库连接
///
/// returns: ()
///
///
pub fn init_setting(con: &mut SqliteConnection) {
    let count = setting_dsl::setting.count().get_result::<i64>(con);
    if count != Ok(1) {
        let default_setting = Settings {
            id: 1,
            language: String::from("zhCN"),
            font_size: 12,
            theme: Theme::AUTO.to_value(),
            refresh_interval: 10,
            editor_font_size: 12,
        };
        diesel::insert_or_ignore_into(setting_dsl::setting)
            .values(default_setting)
            .execute(con)
            .unwrap();
    }
}
