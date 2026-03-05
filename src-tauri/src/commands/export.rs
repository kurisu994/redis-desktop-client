use crate::config::store::ConnectionStore;
use serde::{Deserialize, Serialize};
use tauri::State;

/// 导出文件格式
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportData {
    pub version: u32,
    pub exported_at: String,
    pub connections: Vec<ExportedConnection>,
}

/// 导出时的连接配置（密码可选脱敏）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportedConnection {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
    pub db: u8,
    pub group: Option<String>,
}

/// 导入结果统计
#[derive(Debug, Clone, Serialize)]
pub struct ImportResult {
    pub total: usize,
    pub imported: usize,
    pub skipped: usize,
    pub overwritten: usize,
}

/// 从导出连接构建存储连接（附加默认高级字段）
fn build_stored(
    id: String,
    name: String,
    conn: &ExportedConnection,
) -> crate::config::store::StoredConnection {
    crate::config::store::StoredConnection {
        id,
        name,
        host: conn.host.clone(),
        port: conn.port,
        username: conn.username.clone(),
        password: conn.password.clone(),
        db: conn.db,
        group: conn.group.clone(),
        connection_type: "standalone".to_string(),
        ssh: None,
        tls: None,
        sentinel: None,
        cluster: None,
    }
}

/// 导出连接配置 — 返回 JSON 字符串
#[tauri::command]
pub async fn export_connections(
    store: State<'_, ConnectionStore>,
    ids: Option<Vec<String>>,
    include_password: bool,
) -> Result<String, String> {
    let connections = store.load_connections()?;

    let exported: Vec<ExportedConnection> = connections
        .into_iter()
        .filter(|c| match ids.as_ref() {
            None => true,
            Some(list) => list.contains(&c.id),
        })
        .map(|c| ExportedConnection {
            id: c.id,
            name: c.name,
            host: c.host,
            port: c.port,
            username: c.username,
            password: if include_password {
                c.password
            } else {
                None
            },
            db: c.db,
            group: c.group,
        })
        .collect();

    let data = ExportData {
        version: 1,
        exported_at: chrono::Utc::now().to_rfc3339(),
        connections: exported,
    };

    serde_json::to_string_pretty(&data).map_err(|e| e.to_string())
}

/// 导入连接配置
#[tauri::command]
pub async fn import_connections(
    store: State<'_, ConnectionStore>,
    json: String,
    conflict_strategy: String,
) -> Result<ImportResult, String> {
    let data: ExportData = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    let existing = store.load_connections()?;
    let existing_ids: std::collections::HashSet<String> =
        existing.iter().map(|c| c.id.clone()).collect();
    let existing_names: std::collections::HashSet<String> =
        existing.iter().map(|c| c.name.clone()).collect();

    let mut imported = 0;
    let mut skipped = 0;
    let mut overwritten = 0;

    for conn in &data.connections {
        let exists = existing_ids.contains(&conn.id);

        if exists {
            match conflict_strategy.as_str() {
                "skip" => {
                    skipped += 1;
                    continue;
                }
                "overwrite" => {
                    let stored = build_stored(conn.id.clone(), conn.name.clone(), conn);
                    store.upsert_connection(stored)?;
                    overwritten += 1;
                }
                _ => {
                    // rename: 生成新 ID 和名称
                    let new_id = uuid::Uuid::new_v4().to_string();
                    let mut new_name = conn.name.clone();
                    let mut counter = 1;
                    while existing_names.contains(&new_name) {
                        new_name = format!("{} ({})", conn.name, counter);
                        counter += 1;
                    }
                    let stored = build_stored(new_id, new_name, conn);
                    store.upsert_connection(stored)?;
                    imported += 1;
                }
            }
        } else {
            let stored = build_stored(conn.id.clone(), conn.name.clone(), conn);
            store.upsert_connection(stored)?;
            imported += 1;
        }
    }

    Ok(ImportResult {
        total: data.connections.len(),
        imported,
        skipped,
        overwritten,
    })
}
