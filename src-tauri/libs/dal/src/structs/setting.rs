use serde_derive::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Settings {
    // 语言
    pub language: String,
    // 字体大小
    #[serde(rename = "fontSize")]
    pub font_size: i32,
    // 主题
    pub theme: String,
    // 实时刷新间隔 [秒]
    #[serde(rename = "refreshInterval")]
    pub refresh_interval: u32,
    // 编辑框字体大小
    #[serde(rename = "editorFontSize")]
    pub editor_font_size: i32,
}

#[derive(Debug)]
pub enum ThemeType {
    AUTO,
    LIGHT,
    DARK,
}

impl Default for ThemeType {
    fn default() -> Self {
        ThemeType::AUTO
    }
}