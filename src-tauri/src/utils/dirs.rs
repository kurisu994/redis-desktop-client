use std::path::PathBuf;

use anyhow::Result;
use tauri::api::path::home_dir;

#[cfg(not(feature = "verge-dev"))]
static APP_DIR: &str = "redis-manger";
#[cfg(feature = "verge-dev")]
static APP_DIR: &str = "redis-manger-dev";

static DATE_BASE: &str = "redis-manger.db";


/// get the verge app home dir
pub fn app_home_dir() -> Result<PathBuf> {
    #[cfg(target_os = "windows")]
    unsafe {
        use tauri::utils::platform::current_exe;

        if !PORTABLE_FLAG {
            Ok(home_dir()
                .ok_or(anyhow::anyhow!("failed to get app home dir"))?
                .join(".config")
                .join(APP_DIR))
        } else {
            let app_exe = current_exe()?;
            let app_exe = dunce::canonicalize(app_exe)?;
            let app_dir = app_exe
                .parent()
                .ok_or(anyhow::anyhow!("failed to get the portable app dir"))?;
            Ok(PathBuf::from(app_dir).join(".config").join(APP_DIR))
        }
    }

    #[cfg(not(target_os = "windows"))]
    Ok(home_dir()
        .ok_or(anyhow::anyhow!("failed to get the app home dir"))?
        .join(".config")
        .join(APP_DIR))
}

/// profiles dir
#[cfg(feature = "redis-manager-dev")]
pub fn app_db_path() -> Result<PathBuf> {
    Ok(PathBuf::from(".")
        .join(DATE_BASE)
    )
}

/// profiles dir
#[cfg(not(feature = "redis-manager-dev"))]
pub fn app_db_path() -> Result<PathBuf> {
    Ok(app_home_dir()?
        .join("db")
        .join(DATE_BASE)
    )
}

/// logs dir
#[cfg(feature = "redis-manager-dev")]
pub fn app_logs_dir() -> Result<PathBuf> {
    Ok(PathBuf::from(".").join("logs"))
}

/// logs dir
#[cfg(not(feature = "redis-manager-dev"))]
pub fn app_logs_dir() -> Result<PathBuf> {
    Ok(app_home_dir()?.join("logs"))
}