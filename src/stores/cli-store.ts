import { create } from "zustand";

/** CLI 输出条目 */
export interface OutputEntry {
  /** 条目类型：command=用户输入, result=执行结果, error=错误信息 */
  type: "command" | "result" | "error";
  /** 输出内容 */
  content: string;
  /** 结果类型（仅 result 类型有效） */
  resultType?: string;
  /** 执行耗时 ms */
  elapsedMs?: number;
  /** 时间戳 */
  timestamp: number;
}

/** CLI Tab 会话 */
export interface CliTab {
  id: string;
  /** 关联的连接 ID */
  connectionId: string;
  /** 当前数据库 */
  db: number;
  /** Tab 标题 */
  title: string;
  /** 命令历史 */
  history: string[];
  /** 当前历史浏览索引（-1 表示未浏览） */
  historyIndex: number;
  /** 输出日志 */
  outputs: OutputEntry[];
}

interface CliState {
  /** 所有 CLI Tab */
  tabs: CliTab[];
  /** 当前活跃 Tab ID */
  activeTabId: string | null;

  /** 新增 Tab */
  addTab: (connectionId: string, db: number, title: string) => string;
  /** 关闭 Tab */
  removeTab: (tabId: string) => void;
  /** 切换 Tab */
  setActiveTab: (tabId: string) => void;
  /** 添加输出条目 */
  addOutput: (tabId: string, entry: OutputEntry) => void;
  /** 清空 Tab 输出 */
  clearOutput: (tabId: string) => void;
  /** 添加命令到历史 */
  addHistory: (tabId: string, command: string) => void;
  /** 设置历史索引 */
  setHistoryIndex: (tabId: string, index: number) => void;
  /** 修改 Tab 的 db */
  setTabDb: (tabId: string, db: number) => void;
  /** 获取当前活跃 Tab */
  getActiveTab: () => CliTab | undefined;
  /** 关闭指定连接的所有 Tab */
  removeTabsByConnection: (connectionId: string) => void;
}

/** CLI 状态 Store */
export const useCliStore = create<CliState>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (connectionId, db, title) => {
    const id = crypto.randomUUID();
    const newTab: CliTab = {
      id,
      connectionId,
      db,
      title,
      history: [],
      historyIndex: -1,
      outputs: [],
    };
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: id,
    }));
    return id;
  },

  removeTab: (tabId) => {
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.id !== tabId);
      const newActive =
        state.activeTabId === tabId
          ? newTabs.length > 0
            ? newTabs[newTabs.length - 1].id
            : null
          : state.activeTabId;
      return { tabs: newTabs, activeTabId: newActive };
    });
  },

  setActiveTab: (tabId) => set({ activeTabId: tabId }),

  addOutput: (tabId, entry) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, outputs: [...t.outputs, entry] } : t
      ),
    }));
  },

  clearOutput: (tabId) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, outputs: [] } : t
      ),
    }));
  },

  addHistory: (tabId, command) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId
          ? {
              ...t,
              history: [...t.history, command],
              historyIndex: -1,
            }
          : t
      ),
    }));
  },

  setHistoryIndex: (tabId, index) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, historyIndex: index } : t
      ),
    }));
  },

  setTabDb: (tabId, db) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, db } : t
      ),
    }));
  },

  getActiveTab: () => {
    const state = get();
    return state.tabs.find((t) => t.id === state.activeTabId);
  },

  removeTabsByConnection: (connectionId) => {
    set((state) => {
      const newTabs = state.tabs.filter((t) => t.connectionId !== connectionId);
      const newActive =
        state.activeTabId && !newTabs.find((t) => t.id === state.activeTabId)
          ? newTabs.length > 0
            ? newTabs[newTabs.length - 1].id
            : null
          : state.activeTabId;
      return { tabs: newTabs, activeTabId: newActive };
    });
  },
}));
