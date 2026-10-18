import { create } from "zustand";

/** 连接类型 */
export type ConnectionType = "standalone" | "sentinel" | "cluster";

/** SSH 跳板/终点主机配置 — 隧道链路中的一个节点 */
export interface SshHop {
  host: string;
  port: number;
  username: string;
  /** 认证方式 */
  authType: "password" | "privateKey";
  password?: string;
  privateKeyPath?: string;
  passphrase?: string;
  /** 列表接口：磁盘上已有密码，响应里不会带明文 */
  hasPassword?: boolean;
  /** 列表接口：磁盘上已有 passphrase */
  hasPassphrase?: boolean;
  /** 保存时为 true 则清空已存跳板密码 */
  clearPassword?: boolean;
  /** 保存时为 true 则清空已存 passphrase */
  clearPassphrase?: boolean;
}

/**
 * SSH 隧道配置 — 支持任意 N 跳串联
 *
 * `hops` 数组顺序即链路顺序：第一项是本地直连的 SSH 主机，最后一项是
 * 在其上发起 direct-tcpip channel 到目标 Redis 的"出口"主机。
 */
export interface SshConfig {
  enabled: boolean;
  hops: SshHop[];
}

/** TLS/SSL 配置 */
export interface TlsConfig {
  enabled: boolean;
  /** CA 证书文件路径 */
  caCertPath?: string;
  /** 客户端证书文件路径 */
  clientCertPath?: string;
  /** 客户端密钥文件路径 */
  clientKeyPath?: string;
  /** 是否跳过证书验证（不推荐） */
  skipVerify?: boolean;
}

/** Sentinel 配置 */
export interface SentinelConfig {
  /** Sentinel 节点列表 */
  nodes: { host: string; port: number }[];
  /** Master 名称 */
  masterName: string;
  /** Sentinel 密码。列表接口不返回明文。 */
  sentinelPassword?: string;
  /** 列表接口：磁盘上已有 Sentinel 密码 */
  hasSentinelPassword?: boolean;
  /** 保存时为 true 则清空已存 Sentinel 密码 */
  clearPassword?: boolean;
}

/** Cluster 配置 */
export interface ClusterConfig {
  /** 集群节点列表（种子节点） */
  nodes: { host: string; port: number }[];
}

/** 连接配置类型 */
export interface ConnectionConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username?: string;
  /** 列表接口始终省略明文。保存时 null/缺省表示保留，空字符串或 clearPassword 表示清空。 */
  password?: string;
  /** 列表接口：磁盘上已有 Redis 密码 */
  hasPassword?: boolean;
  /** 保存时为 true 则清空已存 Redis 密码 */
  clearPassword?: boolean;
  db: number;
  group?: string;
  /** 连接类型 */
  connectionType?: ConnectionType;
  /** SSH 隧道配置 */
  ssh?: SshConfig;
  /** TLS/SSL 配置 */
  tls?: TlsConfig;
  /** Sentinel 配置 */
  sentinel?: SentinelConfig;
  /** Cluster 配置 */
  cluster?: ClusterConfig;
}

/** 后端能力状态，与 `get_backend_capabilities` 对齐 */
export type CapabilityStatus = "supported" | "degraded" | "unsupported";

export interface CapabilityFlag {
  status: CapabilityStatus;
  detailKey?: string | null;
  dataConnection: boolean;
  ssh: boolean;
  tls: boolean;
}

/** 密码 IPC 与导出格式约定，供前端按后端真实行为展示 */
export interface BackendCapabilities {
  tls: CapabilityFlag;
  sentinel: CapabilityFlag;
  cluster: CapabilityFlag;
  passwordIpc: {
    listRedactsSecrets: boolean;
    nullMeans: string;
    emptyStringMeans: string;
    clearFlag: string;
    duplicateCommand: string;
  };
  exportSchema: {
    version: number;
    preservesSsh: boolean;
    preservesTls: boolean;
    preservesSentinel: boolean;
    preservesCluster: boolean;
    secretsIncludedOnlyWhen: string;
    redactedField: string;
  };
}

/** 测试连接结果 */
export interface TestResult {
  success: boolean;
  latency_ms: number;
  message: string;
}

type ConnectionStatus = "connected" | "disconnected" | "connecting";

interface ConnectionState {
  /** 所有连接配置 */
  connections: ConnectionConfig[];
  /** 当前活跃连接ID */
  activeConnectionId: string | null;
  /** 连接状态映射 */
  connectionStatus: Record<string, ConnectionStatus>;
  /** 连接错误信息映射 */
  connectionErrors: Record<string, string>;
  /** 新建连接对话框是否打开 */
  isDialogOpen: boolean;
  /** 正在编辑的连接（null 为新建模式） */
  editingConnection: ConnectionConfig | null;

  setConnections: (connections: ConnectionConfig[]) => void;
  addConnection: (connection: ConnectionConfig) => void;
  updateConnection: (id: string, updates: Partial<ConnectionConfig>) => void;
  removeConnection: (id: string) => void;
  setActiveConnection: (id: string | null) => void;
  setConnectionStatus: (id: string, status: ConnectionStatus) => void;
  setConnectionError: (id: string, error: string | null) => void;
  openDialog: (connection?: ConnectionConfig) => void;
  closeDialog: () => void;
}

/** 连接管理 Store */
export const useConnectionStore = create<ConnectionState>((set) => ({
  connections: [],
  activeConnectionId: null,
  connectionStatus: {},
  connectionErrors: {},
  isDialogOpen: false,
  editingConnection: null,

  setConnections: (connections) => set({ connections }),
  addConnection: (connection) =>
    set((state) => ({ connections: [...state.connections, connection] })),
  updateConnection: (id, updates) =>
    set((state) => ({
      connections: state.connections.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    })),
  removeConnection: (id) =>
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== id),
      activeConnectionId:
        state.activeConnectionId === id ? null : state.activeConnectionId,
    })),
  setActiveConnection: (id) => set({ activeConnectionId: id }),
  setConnectionStatus: (id, status) =>
    set((state) => ({
      connectionStatus: { ...state.connectionStatus, [id]: status },
    })),
  setConnectionError: (id, error) =>
    set((state) => {
      if (error === null) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [id]: _removed, ...rest } = state.connectionErrors;
        return { connectionErrors: rest };
      }
      return { connectionErrors: { ...state.connectionErrors, [id]: error } };
    }),
  openDialog: (connection) =>
    set({ isDialogOpen: true, editingConnection: connection ?? null }),
  closeDialog: () => set({ isDialogOpen: false, editingConnection: null }),
}));
