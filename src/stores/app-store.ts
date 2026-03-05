import { create } from "zustand";

/** 主内容区视图模式 */
export type MainView = "browser" | "cli" | "monitor" | "pubsub" | "settings";

interface AppState {
  /** 侧边栏是否折叠 */
  sidebarCollapsed: boolean;
  /** 主内容区当前视图 */
  mainView: MainView;
  /** Key 分隔符（用于树形视图） */
  keySeparator: string;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMainView: (view: MainView) => void;
  setKeySeparator: (sep: string) => void;
}

/** 应用全局状态 Store */
export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  mainView: "browser",
  keySeparator: ":",
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMainView: (view) => set({ mainView: view }),
  setKeySeparator: (sep) => set({ keySeparator: sep }),
}));
