"use client";

import { create } from "zustand";

/** Key 条目 */
export interface KeyEntry {
  key: string;
  key_type: string;
}

/** Key 详细信息 */
export interface KeyInfo {
  key_type: string;
  ttl: number;
  size: number;
  encoding: string;
  length: number;
}

/** 数据库大小信息 */
export interface DbSize {
  db: number;
  size: number;
}

/** 视图模式 */
export type ViewMode = "tree" | "flat";

interface BrowserState {
  /** 当前连接 ID */
  connectionId: string | null;
  /** 当前选择的数据库 */
  selectedDb: number;
  /** 数据库列表（db 编号 + Key 数量） */
  dbList: DbSize[];
  /** 数据库总数 */
  dbCount: number;
  /** 扫描到的 Key 列表 */
  keys: KeyEntry[];
  /** SCAN 游标 */
  scanCursor: number;
  /** 是否扫描完成 */
  scanComplete: boolean;
  /** 当前选中的 Key */
  selectedKey: string | null;
  /** 当前 Key 的详细信息 */
  keyInfo: KeyInfo | null;
  /** 视图模式（树形 / 平铺） */
  viewMode: ViewMode;
  /** 搜索/过滤模式 */
  filterPattern: string;
  /** 加载状态 */
  loading: boolean;
  /** 刷新版本号 */
  refreshVersion: number;
  /** 批量选中的 Key 集合 */
  checkedKeys: Set<string>;
  /** 收藏的 Key 集合（按 connectionId:db 维度） */
  favorites: Set<string>;
  /** 是否仅显示收藏 */
  showFavoritesOnly: boolean;

  // Actions
  setConnectionId: (id: string | null) => void;
  setSelectedDb: (db: number) => void;
  setDbList: (list: DbSize[], count: number) => void;
  setKeys: (keys: KeyEntry[]) => void;
  appendKeys: (keys: KeyEntry[]) => void;
  setScanCursor: (cursor: number) => void;
  setScanComplete: (complete: boolean) => void;
  setSelectedKey: (key: string | null) => void;
  setKeyInfo: (info: KeyInfo | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setFilterPattern: (pattern: string) => void;
  setLoading: (loading: boolean) => void;
  /** 重置浏览器状态（切换连接或 db 时调用） */
  resetBrowser: () => void;
  /** 触发刷新（递增版本号让组件重新加载） */
  refreshKeys: () => void;
  /** 切换单个 Key 的选中状态 */
  toggleCheckedKey: (key: string) => void;
  /** 设置全部选中 / 取消全选 */
  setCheckedKeys: (keys: Set<string>) => void;
  /** 清空选中 */
  clearCheckedKeys: () => void;
  /** 设置收藏列表 */
  setFavorites: (favorites: Set<string>) => void;
  /** 切换收藏状态 */
  toggleFavorite: (key: string) => void;
  /** 切换仅显示收藏 */
  setShowFavoritesOnly: (show: boolean) => void;
}

/** 数据浏览器 Store */
export const useBrowserStore = create<BrowserState>((set) => ({
  connectionId: null,
  selectedDb: 0,
  dbList: [],
  dbCount: 16,
  keys: [],
  scanCursor: 0,
  scanComplete: false,
  selectedKey: null,
  keyInfo: null,
  viewMode: "tree",
  filterPattern: "",
  loading: false,
  refreshVersion: 0,
  checkedKeys: new Set(),
  favorites: new Set(),
  showFavoritesOnly: false,

  setConnectionId: (id) => set({ connectionId: id }),
  setSelectedDb: (db) => set({ selectedDb: db }),
  setDbList: (list, count) => set({ dbList: list, dbCount: count }),
  setKeys: (keys) => set({ keys }),
  appendKeys: (keys) =>
    set((state) => ({ keys: [...state.keys, ...keys] })),
  setScanCursor: (cursor) => set({ scanCursor: cursor }),
  setScanComplete: (complete) => set({ scanComplete: complete }),
  setSelectedKey: (key) => set({ selectedKey: key, keyInfo: null }),
  setKeyInfo: (info) => set({ keyInfo: info }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setFilterPattern: (pattern) => set({ filterPattern: pattern }),
  setLoading: (loading) => set({ loading }),
  resetBrowser: () =>
    set({
      keys: [],
      scanCursor: 0,
      scanComplete: false,
      selectedKey: null,
      keyInfo: null,
      filterPattern: "",
      loading: false,
      checkedKeys: new Set(),
      showFavoritesOnly: false,
    }),
  refreshKeys: () =>
    set((state) => ({
      keys: [],
      scanCursor: 0,
      scanComplete: false,
      refreshVersion: state.refreshVersion + 1,
    })),
  toggleCheckedKey: (key) =>
    set((state) => {
      const next = new Set(state.checkedKeys);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return { checkedKeys: next };
    }),
  setCheckedKeys: (keys) => set({ checkedKeys: keys }),
  clearCheckedKeys: () => set({ checkedKeys: new Set() }),
  setFavorites: (favorites) => set({ favorites }),
  toggleFavorite: (key) =>
    set((state) => {
      const next = new Set(state.favorites);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return { favorites: next };
    }),
  setShowFavoritesOnly: (show) => set({ showFavoritesOnly: show }),
}));
