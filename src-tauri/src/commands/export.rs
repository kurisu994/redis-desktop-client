use crate::config::store::{merge_connection_secrets, ConnectionStore, StoredConnection};
use serde::{Deserialize, Serialize};
use tauri::State;

/// 导出文件。v2 起使用 camelCase，并用 alias 兼容 v1 的 snake_case。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportData {
    pub version: u32,
    #[serde(alias = "exported_at")]
    pub exported_at: String,
    /// v2：机密被省略时为 true。v1 文件没有该字段，默认 false。
    #[serde(default, alias = "secrets_redacted")]
    pub secrets_redacted: bool,
    pub connections: Vec<ExportedConnection>,
}

/// 导出的连接。v2 保留 SSH / TLS / Sentinel / Cluster 元数据。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportedConnection {
    pub id: String,
    pub name: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    #[serde(default)]
    pub password: Option<String>,
    pub db: u8,
    pub group: Option<String>,
    #[serde(default = "default_connection_type", alias = "connection_type")]
    pub connection_type: String,
    #[serde(default)]
    pub ssh: Option<crate::config::store::SshConfig>,
    #[serde(default)]
    pub tls: Option<crate::config::store::TlsConfig>,
    #[serde(default)]
    pub sentinel: Option<crate::config::store::SentinelConfig>,
    #[serde(default)]
    pub cluster: Option<crate::config::store::ClusterConfig>,
    #[serde(default)]
    pub has_password: bool,
}

fn default_connection_type() -> String {
    "standalone".to_string()
}

/// 导入结果统计
#[derive(Debug, Clone, Serialize)]
pub struct ImportResult {
    pub total: usize,
    pub imported: usize,
    pub skipped: usize,
    pub overwritten: usize,
}

pub(crate) fn build_export_data(
    connections: Vec<StoredConnection>,
    include_password: bool,
    exported_at: String,
) -> ExportData {
    let exported = connections
        .into_iter()
        .map(|conn| export_one(conn, include_password))
        .collect();
    ExportData {
        version: 2,
        exported_at,
        secrets_redacted: !include_password,
        connections: exported,
    }
}

fn export_one(mut conn: StoredConnection, include_password: bool) -> ExportedConnection {
    let has_password = conn
        .password
        .as_ref()
        .is_some_and(|value| !value.is_empty());
    if !include_password {
        conn.password = None;
    }
    if let Some(ssh) = conn.ssh.as_mut() {
        for hop in &mut ssh.hops {
            hop.has_password = hop.password.as_ref().is_some_and(|value| !value.is_empty());
            hop.has_passphrase = hop
                .passphrase
                .as_ref()
                .is_some_and(|value| !value.is_empty());
            hop.clear_password = false;
            hop.clear_passphrase = false;
            if !include_password {
                hop.password = None;
                hop.passphrase = None;
            }
        }
    }
    if let Some(sentinel) = conn.sentinel.as_mut() {
        sentinel.has_sentinel_password = sentinel
            .sentinel_password
            .as_ref()
            .is_some_and(|value| !value.is_empty());
        sentinel.clear_password = false;
        if !include_password {
            sentinel.sentinel_password = None;
        }
    }
    ExportedConnection {
        id: conn.id,
        name: conn.name,
        host: conn.host,
        port: conn.port,
        username: conn.username,
        password: conn.password,
        db: conn.db,
        group: conn.group,
        connection_type: conn.connection_type,
        ssh: conn.ssh,
        tls: conn.tls,
        sentinel: conn.sentinel,
        cluster: conn.cluster,
        has_password,
    }
}

pub(crate) fn materialize_imported(
    conn: &ExportedConnection,
    id: String,
    name: String,
    existing: Option<&StoredConnection>,
    secrets_redacted: bool,
) -> StoredConnection {
    let connection_type = if conn.connection_type.trim().is_empty() {
        "standalone".to_string()
    } else {
        conn.connection_type.clone()
    };
    let mut stored = StoredConnection {
        id,
        name,
        host: conn.host.clone(),
        port: conn.port,
        username: conn.username.clone(),
        password: conn.password.clone(),
        db: conn.db,
        group: conn.group.clone(),
        connection_type,
        ssh: conn.ssh.clone(),
        tls: conn.tls.clone(),
        sentinel: conn.sentinel.clone(),
        cluster: conn.cluster.clone(),
    };
    if secrets_redacted {
        merge_connection_secrets(&mut stored, existing, false);
    } else {
        clear_empty_secrets(&mut stored);
    }
    stored
}

fn clear_empty_secrets(stored: &mut StoredConnection) {
    if stored
        .password
        .as_deref()
        .is_some_and(|value| value.is_empty())
    {
        stored.password = None;
    }
    if let Some(ssh) = stored.ssh.as_mut() {
        for hop in &mut ssh.hops {
            if hop
                .password
                .as_deref()
                .is_some_and(|value| value.is_empty())
            {
                hop.password = None;
            }
            if hop
                .passphrase
                .as_deref()
                .is_some_and(|value| value.is_empty())
            {
                hop.passphrase = None;
            }
            hop.has_password = false;
            hop.has_passphrase = false;
            hop.clear_password = false;
            hop.clear_passphrase = false;
        }
    }
    if let Some(sentinel) = stored.sentinel.as_mut() {
        if sentinel
            .sentinel_password
            .as_deref()
            .is_some_and(|value| value.is_empty())
        {
            sentinel.sentinel_password = None;
        }
        sentinel.has_sentinel_password = false;
        sentinel.clear_password = false;
    }
}

/// 导出连接配置 — 返回 JSON 字符串。
///
/// v2 始终带上 SSH / TLS / Sentinel / Cluster 元数据。`include_password` 为 false 时机密留空，
/// 并由 `secretsRedacted: true` 标明。
#[tauri::command]
pub async fn export_connections(
    store: State<'_, ConnectionStore>,
    ids: Option<Vec<String>>,
    include_password: bool,
) -> Result<String, String> {
    let connections = store.load_connections()?;
    let selected = connections
        .into_iter()
        .filter(|conn| match ids.as_ref() {
            None => true,
            Some(list) => list.contains(&conn.id),
        })
        .collect();
    let data = build_export_data(selected, include_password, chrono::Utc::now().to_rfc3339());
    serde_json::to_string_pretty(&data).map_err(|err| err.to_string())
}

/// 导入连接配置。接受 v1（仅基础字段）和 v2（含 SSH/TLS 等元数据）。
#[tauri::command]
pub async fn import_connections(
    store: State<'_, ConnectionStore>,
    json: String,
    conflict_strategy: String,
) -> Result<ImportResult, String> {
    let data: ExportData = serde_json::from_str(&json).map_err(|err| err.to_string())?;
    if data.version == 0 || data.version > 2 {
        return Err("error.export.unsupported_version".to_string());
    }
    let existing = store.load_connections()?;
    let existing_ids: std::collections::HashSet<String> =
        existing.iter().map(|conn| conn.id.clone()).collect();
    let mut existing_names: std::collections::HashSet<String> =
        existing.iter().map(|conn| conn.name.clone()).collect();

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
                    let previous = existing.iter().find(|item| item.id == conn.id);
                    let stored = materialize_imported(
                        conn,
                        conn.id.clone(),
                        conn.name.clone(),
                        previous,
                        data.secrets_redacted,
                    );
                    store.upsert_connection(stored)?;
                    overwritten += 1;
                }
                _ => {
                    let new_id = uuid::Uuid::new_v4().to_string();
                    let mut new_name = conn.name.clone();
                    let mut counter = 1;
                    while existing_names.contains(&new_name) {
                        new_name = format!("{} ({})", conn.name, counter);
                        counter += 1;
                    }
                    existing_names.insert(new_name.clone());
                    let stored =
                        materialize_imported(conn, new_id, new_name, None, data.secrets_redacted);
                    store.upsert_connection(stored)?;
                    imported += 1;
                }
            }
        } else {
            let stored = materialize_imported(
                conn,
                conn.id.clone(),
                conn.name.clone(),
                None,
                data.secrets_redacted,
            );
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::store::{
        ClusterConfig, ClusterNode, SentinelConfig, SentinelNode, SshConfig, SshHop, TlsConfig,
    };

    fn sample() -> StoredConnection {
        StoredConnection {
            id: "c1".into(),
            name: "prod".into(),
            host: "10.0.0.8".into(),
            port: 6379,
            username: Some("alice".into()),
            password: Some("redis-secret".into()),
            db: 2,
            group: None,
            connection_type: "standalone".into(),
            ssh: Some(SshConfig {
                enabled: true,
                hops: vec![SshHop {
                    host: "bastion".into(),
                    port: 22,
                    username: "jump".into(),
                    auth_type: "password".into(),
                    password: Some("ssh-secret".into()),
                    private_key_path: None,
                    passphrase: None,
                    has_password: false,
                    has_passphrase: false,
                    clear_password: false,
                    clear_passphrase: false,
                }],
            }),
            tls: Some(TlsConfig {
                enabled: true,
                ca_cert_path: Some("/ca.pem".into()),
                client_cert_path: None,
                client_key_path: None,
                skip_verify: false,
            }),
            sentinel: Some(SentinelConfig {
                nodes: vec![SentinelNode {
                    host: "10.0.0.9".into(),
                    port: 26379,
                }],
                master_name: "mymaster".into(),
                sentinel_password: Some("sent-secret".into()),
                has_sentinel_password: false,
                clear_password: false,
            }),
            cluster: Some(ClusterConfig {
                nodes: vec![ClusterNode {
                    host: "10.0.0.10".into(),
                    port: 7000,
                }],
            }),
        }
    }

    #[test]
    fn export_v2_keeps_metadata_and_redacts_secrets() {
        let data = build_export_data(vec![sample()], false, "2026-10-18T00:00:00Z".into());
        assert_eq!(data.version, 2);
        assert!(data.secrets_redacted);
        let conn = &data.connections[0];
        assert_eq!(conn.ssh.as_ref().unwrap().hops[0].host, "bastion");
        assert!(conn.ssh.as_ref().unwrap().hops[0].password.is_none());
        assert!(conn.ssh.as_ref().unwrap().hops[0].has_password);
        assert_eq!(
            conn.tls.as_ref().unwrap().ca_cert_path.as_deref(),
            Some("/ca.pem")
        );
        assert_eq!(conn.sentinel.as_ref().unwrap().master_name, "mymaster");
        assert!(conn.sentinel.as_ref().unwrap().sentinel_password.is_none());
        assert_eq!(conn.cluster.as_ref().unwrap().nodes[0].port, 7000);
        assert!(conn.password.is_none());
        assert!(conn.has_password);
        let json = serde_json::to_string(&data).unwrap();
        assert!(!json.contains("redis-secret"));
        assert!(!json.contains("ssh-secret"));
        assert!(!json.contains("sent-secret"));
        assert!(json.contains("secretsRedacted"));
    }

    #[test]
    fn export_v2_can_include_secrets_when_asked() {
        let data = build_export_data(vec![sample()], true, "now".into());
        assert!(!data.secrets_redacted);
        assert_eq!(
            data.connections[0].password.as_deref(),
            Some("redis-secret")
        );
        assert_eq!(
            data.connections[0].ssh.as_ref().unwrap().hops[0]
                .password
                .as_deref(),
            Some("ssh-secret")
        );
    }

    #[test]
    fn import_v1_still_materializes_standalone() {
        let json = r#"{
            "version": 1,
            "exported_at": "2026-01-01T00:00:00Z",
            "connections": [{
                "id": "old",
                "name": "old",
                "host": "127.0.0.1",
                "port": 6379,
                "username": null,
                "password": "legacy",
                "db": 1,
                "group": null
            }]
        }"#;
        let data: ExportData = serde_json::from_str(json).unwrap();
        assert!(!data.secrets_redacted);
        let stored = materialize_imported(
            &data.connections[0],
            "old".into(),
            "old".into(),
            None,
            false,
        );
        assert_eq!(stored.connection_type, "standalone");
        assert!(stored.ssh.is_none());
        assert!(stored.tls.is_none());
        assert_eq!(stored.password.as_deref(), Some("legacy"));
    }

    #[test]
    fn redacted_overwrite_keeps_existing_secrets() {
        let exported = export_one(sample(), false);
        let mut existing = sample();
        existing.password = Some("kept".into());
        let stored = materialize_imported(
            &exported,
            existing.id.clone(),
            existing.name.clone(),
            Some(&existing),
            true,
        );
        assert_eq!(stored.password.as_deref(), Some("kept"));
        assert_eq!(
            stored.ssh.as_ref().unwrap().hops[0].password.as_deref(),
            Some("ssh-secret")
        );
        assert_eq!(
            stored.tls.as_ref().unwrap().ca_cert_path.as_deref(),
            Some("/ca.pem")
        );
    }
}
