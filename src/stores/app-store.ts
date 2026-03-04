import { create } from "zustand";

/** 主内容区视图模式 */
export type MainView = "browser" | "cli";

interface AppState {
  /** 侧边栏是否折叠 */
  sidebarCollapsed: boolean;
  /** 主内容区当前视图 */
  mainView: MainView;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMainView: (view: MainView) => void;
}

/** 应用全局状态 Store */
export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  mainView: "browser",
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setMainView: (view) => set({ mainView: view }),
}));
