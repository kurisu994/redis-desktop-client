import { create } from "zustand";

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
}));
