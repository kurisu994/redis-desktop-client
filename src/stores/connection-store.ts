import { create } from "zustand";

/** 连接类型 */
export type ConnectionType = "standalone" | "sentinel" | "cluster";

/** SSH 隧道配置 */
export interface SshConfig {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  /** 认证方式 */
  authType: "password" | "privateKey";
  password?: string;
  privateKeyPath?: string;
  passphrase?: string;
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
  /** Sentinel 密码 */
  sentinelPassword?: string;
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
  password?: string;
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
  /** 折叠的分组集合 */
  collapsedGroups: Set<string>;

  setConnections: (connections: ConnectionConfig[]) => void;
  addConnection: (connection: ConnectionConfig) => void;
  updateConnection: (id: string, updates: Partial<ConnectionConfig>) => void;
  removeConnection: (id: string) => void;
  setActiveConnection: (id: string | null) => void;
  setConnectionStatus: (id: string, status: ConnectionStatus) => void;
  setConnectionError: (id: string, error: string | null) => void;
  openDialog: (connection?: ConnectionConfig) => void;
  closeDialog: () => void;
  toggleGroupCollapse: (group: string) => void;
  /** 获取所有已使用的分组名 */
  getGroups: () => string[];
}

/** 连接管理 Store */
export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  activeConnectionId: null,
  connectionStatus: {},
  connectionErrors: {},
  isDialogOpen: false,
  editingConnection: null,
  collapsedGroups: new Set<string>(),

  setConnections: (connections) => set({ connections }),
  addConnection: (connection) =>
    set((state) => ({ connections: [...state.connections, connection] })),
  updateConnection: (id, updates) =>
    set((state) => ({
      connections: state.connections.map((c) =>
        c.id === id ? { ...c, ...updates } : c
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
        const { [id]: _removed, ...rest } = state.connectionErrors;
        return { connectionErrors: rest };
      }
      return { connectionErrors: { ...state.connectionErrors, [id]: error } };
    }),
  openDialog: (connection) =>
    set({ isDialogOpen: true, editingConnection: connection ?? null }),
  closeDialog: () => set({ isDialogOpen: false, editingConnection: null }),
  toggleGroupCollapse: (group) =>
    set((state) => {
      const next = new Set(state.collapsedGroups);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return { collapsedGroups: next };
    }),
  getGroups: () => {
    const { connections } = get();
    const groups = new Set<string>();
    connections.forEach((c) => {
      if (c.group) groups.add(c.group);
    });
    return Array.from(groups).sort();
  },
}));
