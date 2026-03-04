import type { ConnectionConfig, TestResult } from "@/stores/connection-store";

/**
 * Tauri IPC 调用封装
 * 在浏览器开发环境中提供 mock 实现，Tauri 环境中调用真实后端
 */

/** 判断是否在 Tauri 环境中运行 */
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/** 动态导入 Tauri invoke */
async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (isTauri()) {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    return tauriInvoke<T>(cmd, args);
  }
  // 浏览器开发环境的 mock 实现
  return handleMock<T>(cmd, args);
}

// ============ Mock 数据（仅开发环境） ============

const mockConnections: ConnectionConfig[] = [];

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
    default:
      throw new Error(`未知的 IPC 命令: ${cmd}`);
  }
}

// ============ 公开 API ============

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

/** 测试连接 */
export async function testConnection(
  host: string,
  port: number,
  username?: string,
  password?: string,
  db?: number
): Promise<TestResult> {
  return invoke<TestResult>("test_connection", {
    host,
    port,
    username: username || null,
    password: password || null,
    db: db ?? 0,
  });
}

/** 连接到 Redis */
export async function connectRedis(id: string): Promise<void> {
  return invoke("connect_redis", { id });
}

/** 断开 Redis 连接 */
export async function disconnectRedis(id: string): Promise<void> {
  return invoke("disconnect_redis", { id });
}
