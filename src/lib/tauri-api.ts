import type { ConnectionConfig, TestResult } from "@/stores/connection-store";
import type { KeyEntry, KeyInfo, DbSize } from "@/stores/browser-store";

/**
 * Tauri IPC 调用封装
 * 在浏览器开发环境中提供 mock 实现，Tauri 环境中调用真实后端
 */

/** 判断是否在 Tauri 环境中运行（Tauri v2 使用 __TAURI_INTERNALS__） */
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** 动态导入 Tauri invoke */
async function invoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (isTauri()) {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return tauriInvoke<T>(cmd, args);
  }
  // 浏览器开发环境的 mock 实现
  return handleMock<T>(cmd, args);
}

// ============ Mock 数据（仅开发环境） ============

const mockConnections: ConnectionConfig[] = [];

/** Mock Key 数据 */
const mockKeys: KeyEntry[] = [
  { key: "user:profile:1001", key_type: "hash" },
  { key: "user:profile:1002", key_type: "hash" },
  { key: "user:session:abc", key_type: "string" },
  { key: "user:tags", key_type: "set" },
  { key: "user:ranking", key_type: "zset" },
  { key: "user:tasks", key_type: "list" },
  { key: "cache:homepage", key_type: "string" },
  { key: "cache:api:users", key_type: "string" },
  { key: "config:app", key_type: "hash" },
  { key: "events:stream", key_type: "stream" },
  { key: "doc:user:profile", key_type: "rejson" },
];

function handleMock<T>(cmd: string, args?: Record<string, unknown>): T {
  switch (cmd) {
    case "list_connections":
      return [...mockConnections] as T;
    case "save_connection": {
      const config = args?.config as ConnectionConfig;
      const idx = mockConnections.findIndex((c) => c.id === config.id);
      if (idx >= 0) {
        mockConnections[idx] = config;
      } else {
        mockConnections.push(config);
      }
      return undefined as T;
    }
    case "delete_connection": {
      const id = args?.id as string;
      const pos = mockConnections.findIndex((c) => c.id === id);
      if (pos >= 0) mockConnections.splice(pos, 1);
      return undefined as T;
    }
    case "reorder_connections": {
      const orderedIds = args?.orderedIds as string[];
      const reordered: ConnectionConfig[] = [];
      for (const id of orderedIds) {
        const conn = mockConnections.find((c) => c.id === id);
        if (conn) reordered.push(conn);
      }
      mockConnections.length = 0;
      mockConnections.push(...reordered);
      return undefined as T;
    }
    case "test_connection":
      return {
        success: true,
        latency_ms: Math.floor(Math.random() * 50) + 1,
        message: "PONG",
      } as T;
    case "connect_redis":
      return undefined as T;
    case "disconnect_redis":
      return undefined as T;

    // Key 浏览 mock
    case "scan_keys": {
      const pattern = (args?.pattern as string) || "*";
      const filtered =
        pattern === "*"
          ? mockKeys
          : mockKeys.filter((k) => k.key.includes(pattern.replace(/\*/g, "")));
      return { cursor: 0, keys: filtered } as T;
    }
    case "get_db_info":
      return {
        db_count: 16,
        db_sizes: [
          { db: 0, size: 10 },
          { db: 1, size: 3 },
        ],
      } as T;
    case "select_database":
      return undefined as T;
    case "get_key_info": {
      const keyName = args?.key as string;
      const entry = mockKeys.find((k) => k.key === keyName);
      return {
        key_type: entry?.key_type || "string",
        ttl: keyName?.includes("cache") ? 300 : -1,
        size: 2048,
        encoding: "ziplist",
        length: 5,
      } as T;
    }
    case "delete_keys":
      return 1 as T;
    case "rename_key":
    case "set_key_ttl":
    case "copy_key":
      return undefined as T;

    // 值操作 mock
    case "get_string_value":
      return '{"message": "Hello, Redis!"}' as T;
    case "get_string_value_partial":
      return '{"message": "Hello, Redis!"}' as T;
    case "get_hash_value":
      return {
        cursor: 0,
        fields: [
          { field: "name", value: "Kurisu" },
          { field: "email", value: "kurisu@example.com" },
          { field: "role", value: "admin" },
        ],
      } as T;
    case "get_list_value":
      return [
        "task_process_images",
        "task_send_emails",
        "task_generate_report",
      ] as T;
    case "get_set_value":
      return {
        cursor: 0,
        members: ["premium_user", "beta_tester", "early_adopter"],
      } as T;
    case "get_zset_value":
      return [
        { member: "user_1001", score: 9850 },
        { member: "user_2045", score: 8420 },
        { member: "user_3012", score: 7200 },
      ] as T;
    case "get_stream_value":
      return [
        {
          id: "1709550000000-0",
          fields: [
            ["event", "login"],
            ["user", "kurisu"],
          ],
        },
        {
          id: "1709550001000-0",
          fields: [
            ["event", "page_view"],
            ["page", "/dashboard"],
          ],
        },
      ] as T;

    // RedisJSON mock
    case "get_json_value":
      return '[{"name":"Kurisu","age":25,"skills":["Rust","TypeScript"],"address":{"city":"Tokyo"}}]' as T;
    case "set_json_value":
      return undefined as T;

    // 写入命令 mock
    case "set_string_value":
    case "set_hash_field":
    case "delete_hash_field":
    case "add_list_element":
    case "set_list_element":
    case "delete_list_element":
    case "add_set_member":
    case "delete_set_member":
    case "add_zset_member":
    case "delete_zset_member":
    case "delete_stream_entry":
      return undefined as T;
    case "add_stream_entry":
      return "1709550002000-0" as T;
    case "create_key":
      return undefined as T;

    // 导入导出 mock
    case "export_connections":
      return JSON.stringify({
        version: 1,
        exported_at: new Date().toISOString(),
        connections: mockConnections,
      }) as T;
    case "import_connections":
      return { total: 0, imported: 0, skipped: 0, overwritten: 0 } as T;

    // CLI mock
    case "execute_command": {
      const cmd = ((args?.command as string) || "").trim().toUpperCase();
      if (cmd === "PING") {
        return { output: "PONG", result_type: "ok", elapsed_ms: 1 } as T;
      }
      if (cmd.startsWith("INFO")) {
        return {
          output: '"# Server\\nredis_version:7.0.0\\nredis_mode:standalone"',
          result_type: "bulk",
          elapsed_ms: 2,
        } as T;
      }
      return {
        output: "OK",
        result_type: "ok",
        elapsed_ms: 1,
      } as T;
    }

    // 服务器信息 mock
    case "get_server_info":
      return {
        server: {
          redis_version: "7.2.4",
          redis_mode: "standalone",
          os: "Darwin 23.4.0 arm64",
          uptime_in_seconds: "86400",
          uptime_in_days: "1",
          tcp_port: "6379",
        },
        clients: {
          connected_clients: "5",
          blocked_clients: "0",
          maxclients: "10000",
        },
        memory: {
          used_memory_human: "2.50M",
          used_memory_peak_human: "3.10M",
          maxmemory_human: "0B",
          mem_fragmentation_ratio: "1.05",
          used_memory: "2621440",
          used_memory_peak: "3250585",
        },
        stats: {
          total_connections_received: "120",
          total_commands_processed: "5430",
          instantaneous_ops_per_sec: "12",
          keyspace_hits: "3200",
          keyspace_misses: "450",
        },
        replication: {
          role: "master",
          connected_slaves: "0",
        },
        keyspace: {
          db0: "keys=10,expires=2,avg_ttl=300000",
          db1: "keys=3,expires=0,avg_ttl=0",
        },
      } as T;

    // 慢查询 mock
    case "get_slowlog":
      return [
        {
          id: 1,
          timestamp: 1709550000,
          duration_us: 15000,
          command: "KEYS *",
          client_addr: "127.0.0.1:52340",
        },
        {
          id: 2,
          timestamp: 1709549900,
          duration_us: 8500,
          command: "SORT mylist",
          client_addr: "127.0.0.1:52341",
        },
      ] as T;
    case "reset_slowlog":
    case "set_slowlog_threshold":
      return undefined as T;

    // Pub/Sub mock
    case "publish_message":
      return { receivers: 1 } as T;
    case "subscribe_channels":
      return undefined as T;

    // Key 数据导入导出 mock
    case "export_keys":
      return JSON.stringify({
        version: 1,
        exported_at: new Date().toISOString(),
        db: 0,
        keys: [
          { key: "test:key", key_type: "string", ttl: -1, value: "hello" },
        ],
      }) as T;
    case "import_keys":
      return { total: 1, imported: 1, skipped: 0, errors: [] } as T;

    default:
      throw new Error(`未知的 IPC 命令: ${cmd}`);
  }
}

// ============ 连接管理 API ============

/** 获取所有连接配置 */
export async function listConnections(): Promise<ConnectionConfig[]> {
  return invoke<ConnectionConfig[]>("list_connections");
}

/** 保存连接配置（新建或更新） */
export async function saveConnection(config: ConnectionConfig): Promise<void> {
  return invoke("save_connection", { config });
}

/** 删除连接配置 */
export async function deleteConnection(id: string): Promise<void> {
  return invoke("delete_connection", { id });
}

/** 重新排序连接列表 */
export async function reorderConnections(orderedIds: string[]): Promise<void> {
  return invoke("reorder_connections", { orderedIds: orderedIds });
}

/** 测试连接 */
export async function testConnection(
  config: ConnectionConfig,
): Promise<TestResult> {
  return invoke<TestResult>("test_connection", { config });
}

/** 连接到 Redis */
export async function connectRedis(id: string): Promise<void> {
  return invoke("connect_redis", { id });
}

/** 断开 Redis 连接 */
export async function disconnectRedis(id: string): Promise<void> {
  return invoke("disconnect_redis", { id });
}

// ============ Key 浏览与管理 API ============

/** SCAN 扫描 Key 列表 */
export async function scanKeys(
  id: string,
  db: number,
  cursor: number,
  pattern: string,
  count: number,
): Promise<{ cursor: number; keys: KeyEntry[] }> {
  return invoke("scan_keys", { id, db, cursor, pattern, count });
}

/** 获取数据库信息 */
export async function getDbInfo(
  id: string,
): Promise<{ db_count: number; db_sizes: DbSize[] }> {
  return invoke("get_db_info", { id });
}

/** 切换数据库 */
export async function selectDatabase(id: string, db: number): Promise<void> {
  return invoke("select_database", { id, db });
}

/** 获取 Key 详细信息 */
export async function getKeyInfo(
  id: string,
  db: number,
  key: string,
): Promise<KeyInfo> {
  return invoke("get_key_info", { id, db, key });
}

/** 批量删除 Key */
export async function deleteKeys(
  id: string,
  db: number,
  keys: string[],
): Promise<number> {
  return invoke("delete_keys", { id, db, keys });
}

/** 重命名 Key */
export async function renameKey(
  id: string,
  db: number,
  oldKey: string,
  newKey: string,
): Promise<void> {
  return invoke("rename_key", { id, db, old_key: oldKey, new_key: newKey });
}

/** 设置 Key TTL */
export async function setKeyTtl(
  id: string,
  db: number,
  key: string,
  ttl: number,
): Promise<void> {
  return invoke("set_key_ttl", { id, db, key, ttl });
}

/** 复制 Key */
export async function copyKey(
  id: string,
  db: number,
  src: string,
  dst: string,
): Promise<void> {
  return invoke("copy_key", { id, db, src, dst });
}

// ============ 值操作 API ============

/** 获取 String 值 */
export async function getStringValue(
  id: string,
  db: number,
  key: string,
): Promise<string> {
  return invoke("get_string_value", { id, db, key });
}

/** 部分读取 String 值 — 用于大值延迟加载 */
export async function getStringValuePartial(
  id: string,
  db: number,
  key: string,
  start: number,
  end: number,
): Promise<string> {
  return invoke("get_string_value_partial", { id, db, key, start, end });
}

/** 获取 Hash 值 */
export async function getHashValue(
  id: string,
  db: number,
  key: string,
  cursor: number,
  pattern: string,
  count: number,
): Promise<{ cursor: number; fields: { field: string; value: string }[] }> {
  return invoke("get_hash_value", { id, db, key, cursor, pattern, count });
}

/** 获取 List 值 */
export async function getListValue(
  id: string,
  db: number,
  key: string,
  start: number,
  stop: number,
): Promise<string[]> {
  return invoke("get_list_value", { id, db, key, start, stop });
}

/** 获取 Set 值 */
export async function getSetValue(
  id: string,
  db: number,
  key: string,
  cursor: number,
  pattern: string,
  count: number,
): Promise<{ cursor: number; members: string[] }> {
  return invoke("get_set_value", { id, db, key, cursor, pattern, count });
}

/** 获取 ZSet 值 */
export async function getZsetValue(
  id: string,
  db: number,
  key: string,
  start: number,
  stop: number,
): Promise<{ member: string; score: number }[]> {
  return invoke("get_zset_value", { id, db, key, start, stop });
}

/** 获取 Stream 值 */
export async function getStreamValue(
  id: string,
  db: number,
  key: string,
  start: string,
  end: string,
  count: number,
): Promise<{ id: string; fields: [string, string][] }[]> {
  return invoke("get_stream_value", { id, db, key, start, end, count });
}

/** 设置 String 值 */
export async function setStringValue(
  id: string,
  db: number,
  key: string,
  value: string,
  ttl?: number,
): Promise<void> {
  return invoke("set_string_value", { id, db, key, value, ttl: ttl ?? null });
}

/** 设置 Hash 字段 */
export async function setHashField(
  id: string,
  db: number,
  key: string,
  field: string,
  value: string,
): Promise<void> {
  return invoke("set_hash_field", { id, db, key, field, value });
}

/** 删除 Hash 字段 */
export async function deleteHashField(
  id: string,
  db: number,
  key: string,
  field: string,
): Promise<void> {
  return invoke("delete_hash_field", { id, db, key, field });
}

/** 添加 List 元素 */
export async function addListElement(
  id: string,
  db: number,
  key: string,
  value: string,
  position: "head" | "tail",
): Promise<void> {
  return invoke("add_list_element", { id, db, key, value, position });
}

/** 设置 List 元素 */
export async function setListElement(
  id: string,
  db: number,
  key: string,
  index: number,
  value: string,
): Promise<void> {
  return invoke("set_list_element", { id, db, key, index, value });
}

/** 删除 List 元素 */
export async function deleteListElement(
  id: string,
  db: number,
  key: string,
  index: number,
): Promise<void> {
  return invoke("delete_list_element", { id, db, key, index });
}

/** 添加 Set 成员 */
export async function addSetMember(
  id: string,
  db: number,
  key: string,
  member: string,
): Promise<void> {
  return invoke("add_set_member", { id, db, key, member });
}

/** 删除 Set 成员 */
export async function deleteSetMember(
  id: string,
  db: number,
  key: string,
  member: string,
): Promise<void> {
  return invoke("delete_set_member", { id, db, key, member });
}

/** 添加 ZSet 成员 */
export async function addZsetMember(
  id: string,
  db: number,
  key: string,
  member: string,
  score: number,
): Promise<void> {
  return invoke("add_zset_member", { id, db, key, member, score });
}

/** 删除 ZSet 成员 */
export async function deleteZsetMember(
  id: string,
  db: number,
  key: string,
  member: string,
): Promise<void> {
  return invoke("delete_zset_member", { id, db, key, member });
}

/** 添加 Stream 条目 */
export async function addStreamEntry(
  id: string,
  db: number,
  key: string,
  fields: [string, string][],
): Promise<string> {
  return invoke("add_stream_entry", { id, db, key, fields });
}

/** 删除 Stream 条目 */
export async function deleteStreamEntry(
  id: string,
  db: number,
  key: string,
  entryId: string,
): Promise<void> {
  return invoke("delete_stream_entry", { id, db, key, entry_id: entryId });
}

/** 创建新 Key */
export async function createKey(
  id: string,
  db: number,
  key: string,
  keyType: string,
  value: string,
  ttl?: number,
): Promise<void> {
  return invoke("create_key", {
    id,
    db,
    key,
    key_type: keyType,
    value,
    ttl: ttl ?? null,
  });
}

// ============ 导入导出 API ============

/** 导出连接配置 */
export async function exportConnections(
  ids?: string[],
  includePassword: boolean = false,
): Promise<string> {
  return invoke("export_connections", {
    ids: ids ?? null,
    include_password: includePassword,
  });
}

/** 导入连接配置 */
export async function importConnections(
  json: string,
  conflictStrategy: "skip" | "overwrite" | "rename",
): Promise<{
  total: number;
  imported: number;
  skipped: number;
  overwritten: number;
}> {
  return invoke("import_connections", {
    json,
    conflict_strategy: conflictStrategy,
  });
}

// ============ CLI API ============

/** CLI 命令执行结果 */
export interface CommandResult {
  output: string;
  result_type: string;
  elapsed_ms: number;
}

/** 执行 Redis 命令 */
export async function executeCommand(
  id: string,
  db: number,
  command: string,
): Promise<CommandResult> {
  return invoke<CommandResult>("execute_command", { id, db, command });
}

// ============ 服务器信息与监控 API ============

/** 服务器信息 — 分区结构化数据 */
export type ServerInfo = Record<string, Record<string, string>>;

/** 慢查询日志条目 */
export interface SlowLogEntry {
  id: number;
  timestamp: number;
  duration_us: number;
  command: string;
  client_addr: string;
}

/** 获取服务器 INFO 信息 */
export async function getServerInfo(id: string): Promise<ServerInfo> {
  return invoke<ServerInfo>("get_server_info", { id });
}

/** 获取慢查询日志 */
export async function getSlowLog(
  id: string,
  count?: number,
): Promise<SlowLogEntry[]> {
  return invoke<SlowLogEntry[]>("get_slowlog", { id, count: count ?? null });
}

/** 清空慢查询日志 */
export async function resetSlowLog(id: string): Promise<void> {
  return invoke("reset_slowlog", { id });
}

/** 设置慢查询阈值 (microseconds) */
export async function setSlowLogThreshold(
  id: string,
  threshold: number,
): Promise<void> {
  return invoke("set_slowlog_threshold", { id, threshold });
}

// ============ Pub/Sub API ============

/** 发布消息结果 */
export interface PublishResult {
  receivers: number;
}

/** Pub/Sub 消息事件 */
export interface PubSubMessage {
  connection_id: string;
  channel: string;
  message: string;
  timestamp: number;
}

/** 订阅频道 */
export async function subscribeChannels(
  id: string,
  channels: string[],
): Promise<void> {
  return invoke("subscribe_channels", { id, channels });
}

/** 发布消息 */
export async function publishMessage(
  id: string,
  channel: string,
  message: string,
): Promise<PublishResult> {
  return invoke<PublishResult>("publish_message", { id, channel, message });
}

// ============ Key 数据导入导出 API ============

/** Key 导入结果 */
export interface KeyImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: string[];
}

/** 导出 Key 数据为 JSON 字符串 */
export async function exportKeys(
  id: string,
  db: number,
  keys: string[],
): Promise<string> {
  return invoke<string>("export_keys", { id, db, keys });
}

/** 从 JSON 导入 Key 数据 */
export async function importKeys(
  id: string,
  db: number,
  json: string,
  conflictStrategy: "skip" | "overwrite" | "rename",
): Promise<KeyImportResult> {
  return invoke<KeyImportResult>("import_keys", {
    id,
    db,
    json,
    conflict_strategy: conflictStrategy,
  });
}

// ============ RedisJSON API ============

/** 获取 RedisJSON 值 */
export async function getJsonValue(
  id: string,
  db: number,
  key: string,
  path?: string,
): Promise<string> {
  return invoke("get_json_value", { id, db, key, path: path ?? null });
}

/** 设置 RedisJSON 值 */
export async function setJsonValue(
  id: string,
  db: number,
  key: string,
  path: string,
  value: string,
): Promise<void> {
  return invoke("set_json_value", { id, db, key, path, value });
}

// ============ 应用更新 API ============

/** 更新信息 */
export interface UpdateInfo {
  version: string;
  date: string | null;
  body: string | null;
}

/** 下载进度事件 */
export type DownloadEvent =
  | { event: "Started"; data: { contentLength: number | null } }
  | { event: "Progress"; data: { chunkLength: number } }
  | { event: "Finished" };

/** 检查应用更新 */
export async function checkUpdate(): Promise<UpdateInfo | null> {
  if (!isTauri()) {
    // 浏览器环境 mock：无可用更新
    return null;
  }
  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  if (!update) return null;
  return {
    version: update.version,
    date: update.date ?? null,
    body: update.body ?? null,
  };
}

/** 下载并安装更新 */
export async function downloadAndInstallUpdate(
  onProgress?: (event: DownloadEvent) => void,
): Promise<void> {
  if (!isTauri()) return;
  const { check } = await import("@tauri-apps/plugin-updater");
  const update = await check();
  if (!update) return;
  await update.downloadAndInstall((event) => {
    onProgress?.(event as DownloadEvent);
  });
}

/** 重启应用（用于更新完成后） */
export async function relaunchApp(): Promise<void> {
  if (!isTauri()) return;
  const { relaunch } = await import("@tauri-apps/plugin-process");
  await relaunch();
}
