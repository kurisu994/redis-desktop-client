import { create } from "zustand";
import type { ServerInfo, SlowLogEntry } from "@/lib/tauri-api";

/** 监控数据快照（用于实时图表） */
export interface MonitorSnapshot {
  timestamp: number;
  ops_per_sec: number;
  used_memory: number;
  connected_clients: number;
  hit_rate: number;
}

/** 监控页面 Tab */
export type MonitorTab = "info" | "realtime" | "slowlog";

interface MonitorState {
  /** 当前 Tab */
  activeTab: MonitorTab;
  /** 服务器 INFO 数据 */
  serverInfo: ServerInfo | null;
  /** 慢查询日志 */
  slowLog: SlowLogEntry[];
  /** 实时监控数据快照（最近 60 个点） */
  snapshots: MonitorSnapshot[];
  /** 自动刷新间隔 (ms)，0 表示暂停 */
  refreshInterval: number;
  /** 是否暂停实时监控 */
  paused: boolean;
  /** 加载状态 */
  loading: boolean;

  setActiveTab: (tab: MonitorTab) => void;
  setServerInfo: (info: ServerInfo) => void;
  setSlowLog: (entries: SlowLogEntry[]) => void;
  addSnapshot: (snapshot: MonitorSnapshot) => void;
  setRefreshInterval: (interval: number) => void;
  setPaused: (paused: boolean) => void;
  setLoading: (loading: boolean) => void;
  resetMonitor: () => void;
}

/** 服务器监控 Store */
export const useMonitorStore = create<MonitorState>((set) => ({
  activeTab: "info",
  serverInfo: null,
  slowLog: [],
  snapshots: [],
  refreshInterval: 5000,
  paused: false,
  loading: false,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setServerInfo: (info) => set({ serverInfo: info }),
  setSlowLog: (entries) => set({ slowLog: entries }),
  addSnapshot: (snapshot) =>
    set((state) => ({
      snapshots: [...state.snapshots.slice(-59), snapshot],
    })),
  setRefreshInterval: (interval) => set({ refreshInterval: interval }),
  setPaused: (paused) => set({ paused }),
  setLoading: (loading) => set({ loading }),
  resetMonitor: () =>
    set({
      serverInfo: null,
      slowLog: [],
      snapshots: [],
      paused: false,
      loading: false,
    }),
}));
