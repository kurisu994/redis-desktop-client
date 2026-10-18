use serde::Serialize;

/// 单个连接模式的能力。前端用 `status` + `detailKey` 决定文案，不要再猜测后端是否真的连上了。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CapabilityFlag {
    /// `supported` | `degraded` | `unsupported`
    pub status: &'static str,
    /// i18n key。`supported` 且没有额外说明时为 null。
    pub detail_key: Option<&'static str>,
    /// 该模式能否建立真实数据连接。
    pub data_connection: bool,
    pub ssh: bool,
    pub tls: bool,
}

/// 密码相关 IPC 约定。列表接口不再返回明文。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PasswordIpcContract {
    pub list_redacts_secrets: bool,
    /// `password` / hop `password` / `sentinelPassword` 为 null 或缺省时的含义。
    pub null_means: &'static str,
    /// 空字符串的含义。
    pub empty_string_means: &'static str,
    /// 显式清空字段名：连接级、跳板级、Sentinel 级都叫 `clearPassword`。
    pub clear_flag: &'static str,
    /// 复制连接的命令名。不要用前端手里的脱敏配置再 save 一次。
    pub duplicate_command: &'static str,
}

/// 连接配置导出格式。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSchemaContract {
    pub version: u32,
    pub preserves_ssh: bool,
    pub preserves_tls: bool,
    pub preserves_sentinel: bool,
    pub preserves_cluster: bool,
    /// 只有 `includePassword=true` 时才把机密写进文件。
    pub secrets_included_only_when: &'static str,
    /// 机密被省略时导出的布尔字段名。
    pub redacted_field: &'static str,
}

/// 后端当前真实能力。UI 文案应跟这里对齐，而不是写死“已支持 Cluster”。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackendCapabilities {
    pub tls: CapabilityFlag,
    pub sentinel: CapabilityFlag,
    pub cluster: CapabilityFlag,
    pub password_ipc: PasswordIpcContract,
    pub export_schema: ExportSchemaContract,
}

#[tauri::command]
pub fn get_backend_capabilities() -> BackendCapabilities {
    current_capabilities()
}

pub fn current_capabilities() -> BackendCapabilities {
    BackendCapabilities {
        tls: CapabilityFlag {
            status: "supported",
            detail_key: Some("capability.tls.supported"),
            data_connection: true,
            ssh: true,
            tls: true,
        },
        sentinel: CapabilityFlag {
            status: "degraded",
            detail_key: Some("capability.sentinel.degraded"),
            data_connection: true,
            ssh: false,
            tls: true,
        },
        cluster: CapabilityFlag {
            status: "unsupported",
            detail_key: Some("capability.cluster.unsupported"),
            data_connection: false,
            ssh: false,
            tls: false,
        },
        password_ipc: PasswordIpcContract {
            list_redacts_secrets: true,
            null_means: "keep",
            empty_string_means: "clear",
            clear_flag: "clearPassword",
            duplicate_command: "duplicate_connection",
        },
        export_schema: ExportSchemaContract {
            version: 2,
            preserves_ssh: true,
            preserves_tls: true,
            preserves_sentinel: true,
            preserves_cluster: true,
            secrets_included_only_when: "includePassword=true",
            redacted_field: "secretsRedacted",
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn cluster_is_explicitly_unsupported() {
        let caps = current_capabilities();
        assert_eq!(caps.cluster.status, "unsupported");
        assert!(!caps.cluster.data_connection);
        assert_eq!(caps.sentinel.status, "degraded");
        assert!(caps.sentinel.data_connection);
        assert_eq!(caps.tls.status, "supported");
        assert!(caps.password_ipc.list_redacts_secrets);
        assert_eq!(caps.export_schema.version, 2);
        assert!(caps.export_schema.preserves_ssh);
        assert!(caps.export_schema.preserves_tls);
    }
}
