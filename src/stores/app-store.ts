import { create } from "zustand";

/** Tab 类型 */
export type TabType = "browser" | "cli" | "monitor" | "pubsub" | "settings";

/** Tab 页签 */
export interface Tab {
  /** 唯一标识 */
  id: string;
  /** Tab 类型 */
  type: TabType;
  /** 是否可关闭（browser 不可关闭） */
  closable: boolean;
}

/** 默认的 browser Tab — 始终存在 */
const BROWSER_TAB: Tab = {
  id: "browser",
  type: "browser",
  closable: false,
};

interface AppState {
  /** 侧边栏是否折叠 */
  sidebarCollapsed: boolean;
  /** 已打开的 Tab 列表 */
  tabs: Tab[];
  /** 当前活跃 Tab ID */
  activeTabId: string;
  /** Key 分隔符（用于树形视图） */
  keySeparator: string;
  /** 命令面板是否打开 */
  commandPaletteOpen: boolean;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** 打开或激活指定类型的 Tab */
  openTab: (type: TabType) => void;
  /** 关闭指定 Tab */
  closeTab: (id: string) => void;
  /** 激活指定 Tab */
  activateTab: (id: string) => void;
  setKeySeparator: (sep: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
}

/** 应用全局状态 Store */
export const useAppStore = create<AppState>((set, get) => ({
  sidebarCollapsed: false,
  tabs: [BROWSER_TAB],
  activeTabId: "browser",
  keySeparator: ":",
  commandPaletteOpen: false,

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

  openTab: (type) => {
    const { tabs } = get();
    // 如果该类型的 Tab 已存在，直接激活
    const existing = tabs.find((t) => t.type === type);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }
    // 创建新 Tab
    const newTab: Tab = {
      id: `${type}-${Date.now()}`,
      type,
      closable: true,
    };
    set({ tabs: [...tabs, newTab], activeTabId: newTab.id });
  },

  closeTab: (id) => {
    const { tabs, activeTabId } = get();
    const tab = tabs.find((t) => t.id === id);
    // 不可关闭的 Tab 不处理
    if (!tab || !tab.closable) return;

    const newTabs = tabs.filter((t) => t.id !== id);
    // 如果关闭的是当前活跃 Tab，切换到前一个 Tab
    if (activeTabId === id) {
      const closedIndex = tabs.findIndex((t) => t.id === id);
      const newActiveIndex = Math.max(0, closedIndex - 1);
      set({ tabs: newTabs, activeTabId: newTabs[newActiveIndex].id });
    } else {
      set({ tabs: newTabs });
    }
  },

  activateTab: (id) => {
    const { tabs } = get();
    if (tabs.some((t) => t.id === id)) {
      set({ activeTabId: id });
    }
  },

  setKeySeparator: (sep) => set({ keySeparator: sep }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
}));
