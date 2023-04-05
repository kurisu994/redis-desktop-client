use std::fs;

use anyhow::Result;
use chrono::Local;
use diesel_migrations::{EmbeddedMigrations, MigrationHarness};
use log::LevelFilter;
use log4rs::append::console::ConsoleAppender;
use log4rs::append::file::FileAppender;
use log4rs::config::{Appender, Config, Logger, Root};
use log4rs::encode::pattern::PatternEncoder;

use crate::dao::db;
use crate::dao::setting::init_setting;
use crate::utils::dirs;

static DATE_BASE: &str = "redis-manger.db";

pub fn init_application(migrations_source: EmbeddedMigrations) -> Result<()> {
    #[cfg(feature = "redis-manager-dev")]
    let _ = init_log(LevelFilter::Debug);
    #[cfg(not(feature = "redis-manager-dev"))]
    let _ = init_log(LevelFilter::Info);

    crate::log_err!(dirs::app_home_dir().map(|app_dir| {
        if !app_dir.exists() {
            let _ = fs::create_dir_all(&app_dir);
        }
    }));

    init_data_base(migrations_source)?;

    Ok(())
}

/// initialize db
fn init_data_base(migrations_source: EmbeddedMigrations) -> Result<()> {
    let db_dir = dirs::app_db_dir()?;
    if !db_dir.exists() {
        let _ = fs::create_dir_all(&db_dir);
    }
    let db_path = db_dir.join(DATE_BASE);
    let database_url = db_path.to_str().unwrap();
    db::set_path(database_url);
    let mut sqlite_connection = db::establish_connection();
    sqlite_connection
        .run_pending_migrations(migrations_source)
        .expect("Error migrating");
    init_setting(&mut sqlite_connection);
    Ok(())
}

/// initialize this instance's log file
fn init_log(level: LevelFilter) -> Result<()> {
    let log_dir = dirs::app_logs_dir()?;
    if !log_dir.exists() {
        let _ = fs::create_dir_all(&log_dir);
    }

    let local_time = Local::now().format("%Y-%m-%d").to_string();
    let log_file = format!("{}.log", local_time);
    let log_file = log_dir.join(log_file);

    #[cfg(feature = "redis-manager-dev")]
    let time_format = "{d(%Y-%m-%d %H:%M:%S)} {l} - {M} {m}{n}";
    #[cfg(not(feature = "redis-manager-dev"))]
    let time_format = "{d(%Y-%m-%d %H:%M:%S)} {l} - {m}{n}";

    let encode = Box::new(PatternEncoder::new(time_format));
    let stdout = ConsoleAppender::builder().encoder(encode.clone()).build();
    let tofile = FileAppender::builder().encoder(encode).build(log_file)?;

    let config = Config::builder()
        .appender(Appender::builder().build("stdout", Box::new(stdout)))
        .appender(Appender::builder().build("file", Box::new(tofile)))
        .logger(
            Logger::builder()
                .appenders(["file", "stdout"])
                .additive(false)
                .build("app", level),
        )
        .build(Root::builder().appender("stdout").build(level))?;
    log4rs::init_config(config)?;

    Ok(())
}
