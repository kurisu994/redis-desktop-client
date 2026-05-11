"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBrowserStore, type KeyEntry } from "@/stores/browser-store";
import { useConnectionStore } from "@/stores/connection-store";
import {
  scanKeys,
  getDbInfo,
  getKeyInfo,
  deleteKeys,
  exportKeys,
} from "@/lib/tauri-api";
import { KeyToolbar } from "./key-toolbar";
import { KeyTree, type KeyTreeHandle } from "./key-tree";
import { KeyList, type KeyListHandle } from "./key-list";
import { KeyDetail } from "./key-detail";
import { ValueViewer } from "./viewers/value-viewer";
import { Button } from "@/components/ui/button";
import {
  Database,
  Trash2,
  Download,
  X,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";
import { ConfirmDangerDialog } from "@/components/confirm-danger-dialog";
import { toast } from "sonner";

/** 将 Redis MATCH glob 转为前端正则，用于判断新增 Key 是否应出现在当前过滤列表 */
function globPatternToRegExp(pattern: string) {
  let regex = "^";
  for (const char of pattern) {
    if (char === "*") {
      regex += ".*";
    } else if (char === "?") {
      regex += ".";
    } else {
      regex += char.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
    }
  }
  return new RegExp(`${regex}$`);
}

/** 判断 Key 是否匹配当前过滤模式 */
function matchesFilterPattern(key: string, pattern: string) {
  const normalizedPattern = pattern.trim() || "*";
  if (normalizedPattern === "*") return true;
  return globPatternToRegExp(normalizedPattern).test(key);
}

/** 数据浏览器主容器 — 工具栏 + 左右分栏（Key 列表 + 值编辑器） */
export function DataBrowser() {
  const { t } = useTranslation();
  const { activeConnectionId, connectionStatus } = useConnectionStore();
  const connectionId = useBrowserStore((s) => s.connectionId);
  const selectedDb = useBrowserStore((s) => s.selectedDb);
  const keys = useBrowserStore((s) => s.keys);
  const scanCursor = useBrowserStore((s) => s.scanCursor);
  const scanComplete = useBrowserStore((s) => s.scanComplete);
  const selectedKey = useBrowserStore((s) => s.selectedKey);
  const keyInfo = useBrowserStore((s) => s.keyInfo);
  const keyExpired = useBrowserStore((s) => s.keyExpired);
  const viewMode = useBrowserStore((s) => s.viewMode);
  const filterPattern = useBrowserStore((s) => s.filterPattern);
  const loading = useBrowserStore((s) => s.loading);
  const refreshVersion = useBrowserStore((s) => s.refreshVersion);
  const checkedKeys = useBrowserStore((s) => s.checkedKeys);
  const clearCheckedKeys = useBrowserStore((s) => s.clearCheckedKeys);
  const setCheckedKeys = useBrowserStore((s) => s.setCheckedKeys);
  const showFavoritesOnly = useBrowserStore((s) => s.showFavoritesOnly);
  const favorites = useBrowserStore((s) => s.favorites);
  const setFavorites = useBrowserStore((s) => s.setFavorites);
  const setConnectionId = useBrowserStore((s) => s.setConnectionId);
  const setKeys = useBrowserStore((s) => s.setKeys);
  const upsertKey = useBrowserStore((s) => s.upsertKey);
  const removeKeysFromStore = useBrowserStore((s) => s.removeKeys);
  const renameKeyEntry = useBrowserStore((s) => s.renameKeyEntry);
  const updateDbSize = useBrowserStore((s) => s.updateDbSize);
  const appendKeys = useBrowserStore((s) => s.appendKeys);
  const setScanCursor = useBrowserStore((s) => s.setScanCursor);
  const setScanComplete = useBrowserStore((s) => s.setScanComplete);
  const setSelectedKey = useBrowserStore((s) => s.setSelectedKey);
  const setKeyExpired = useBrowserStore((s) => s.setKeyExpired);
  const setKeyInfo = useBrowserStore((s) => s.setKeyInfo);
  const setLoading = useBrowserStore((s) => s.setLoading);
  const setDbList = useBrowserStore((s) => s.setDbList);
  const resetBrowser = useBrowserStore((s) => s.resetBrowser);

  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showDeleteKeyConfirm, setShowDeleteKeyConfirm] = useState(false);
  const keyTreeRef = useRef<KeyTreeHandle>(null);
  const keyListRef = useRef<KeyListHandle>(null);

  /** 左栏宽度（可拖拽调节） */
  const [panelWidth, setPanelWidth] = useState(288);
  const isDragging = useRef(false);
  /** 拖拽起始时的鼠标 X 坐标 */
  const dragStartX = useRef(0);
  /** 拖拽起始时的面板宽度 */
  const dragStartWidth = useRef(0);

  /** 拖拽调整左栏宽度 */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      // 用鼠标移动差值计算新宽度，避免 clientX 包含侧边栏偏移导致跳变
      const delta = e.clientX - dragStartX.current;
      const newWidth = Math.max(
        200,
        Math.min(600, dragStartWidth.current + delta),
      );
      setPanelWidth(newWidth);
    };
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const connectedId =
    activeConnectionId && connectionStatus[activeConnectionId] === "connected"
      ? activeConnectionId
      : null;

  /** 收藏持久化 — 加载（tauri-plugin-store 或 localStorage） */
  useEffect(() => {
    if (!connectedId) return;
    const storageKey = `favorites:${connectedId}:${selectedDb}`;
    (async () => {
      try {
        if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
          const { load } = await import("@tauri-apps/plugin-store");
          const store = await load("favorites.json", {
            autoSave: true,
            defaults: {},
          });
          const saved = await store.get<string[]>(storageKey);
          if (saved) setFavorites(new Set(saved));
        } else {
          const saved = localStorage.getItem(storageKey);
          if (saved) setFavorites(new Set(JSON.parse(saved)));
        }
      } catch {
        // 无持久化数据时忽略
      }
    })();
  }, [connectedId, selectedDb, setFavorites]);

  /** 收藏持久化 — 保存 */
  useEffect(() => {
    if (!connectedId) return;
    const storageKey = `favorites:${connectedId}:${selectedDb}`;
    const favArray = Array.from(favorites);
    (async () => {
      try {
        if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
          const { load } = await import("@tauri-apps/plugin-store");
          const store = await load("favorites.json", {
            autoSave: true,
            defaults: {},
          });
          await store.set(storageKey, favArray);
        } else {
          localStorage.setItem(storageKey, JSON.stringify(favArray));
        }
      } catch {
        // 保存失败时静默
      }
    })();
  }, [favorites, connectedId, selectedDb]);

  /** 初始化：切换连接时重置并加载 db 信息 */
  useEffect(() => {
    if (connectedId && connectedId !== connectionId) {
      setConnectionId(connectedId);
      resetBrowser();
      getDbInfo(connectedId)
        .then((info) => setDbList(info.db_sizes, info.db_count))
        .catch(() => toast.error(t("browser.scanFailed")));
    } else if (!connectedId) {
      setConnectionId(null);
      resetBrowser();
    }
  }, [connectedId, connectionId, setConnectionId, resetBrowser, setDbList, t]);

  /** 单次加载 Key 的最大数量，防止大数据库耗尽内存 */
  const MAX_LOAD_KEYS = 100_000;

  /** 加载 Key 列表 — 自动分片加载全部 Key（受 MAX_LOAD_KEYS 限制） */
  const loadKeys = useCallback(
    async (reset = false) => {
      if (!connectedId) return;
      setLoading(true);
      try {
        let cursor = reset ? 0 : scanCursor;
        let totalLoaded = reset ? 0 : keys.length;
        if (reset) {
          // 重置时先清空并加载第一批
          const result = await scanKeys(
            connectedId,
            selectedDb,
            0,
            filterPattern || "*",
            200,
          );
          setKeys(result.keys);
          totalLoaded = result.keys.length;
          cursor = result.cursor;
          setScanCursor(cursor);
          setScanComplete(cursor === 0);
          // 自动继续加载剩余批次
          while (cursor !== 0 && totalLoaded < MAX_LOAD_KEYS) {
            const next = await scanKeys(
              connectedId,
              selectedDb,
              cursor,
              filterPattern || "*",
              200,
            );
            appendKeys(next.keys);
            totalLoaded += next.keys.length;
            cursor = next.cursor;
            setScanCursor(cursor);
            setScanComplete(cursor === 0 || totalLoaded >= MAX_LOAD_KEYS);
          }
          if (totalLoaded >= MAX_LOAD_KEYS && cursor !== 0) {
            toast.info(
              t("browser.maxLoadKeysReached", { count: MAX_LOAD_KEYS }),
            );
          }
        } else if (!scanComplete) {
          // 手动触发继续加载（兜底，正常不会用到）
          const result = await scanKeys(
            connectedId,
            selectedDb,
            cursor,
            filterPattern || "*",
            200,
          );
          appendKeys(result.keys);
          setScanCursor(result.cursor);
          setScanComplete(result.cursor === 0);
        }
      } catch {
        toast.error(t("browser.scanFailed"));
      } finally {
        setLoading(false);
      }
    },
    [
      connectedId,
      selectedDb,
      scanCursor,
      scanComplete,
      filterPattern,
      setKeys,
      appendKeys,
      setScanCursor,
      setScanComplete,
      setLoading,
      t,
      keys.length,
    ],
  );

  /** db 切换或连接初始化后自动加载 Key */
  useEffect(() => {
    if (connectedId) {
      loadKeys(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedId, selectedDb]);

  /** 处理已过期或不存在的 Key — 仅标记过期状态，不自动刷新列表 */
  const handleExpiredKey = useCallback(() => {
    setKeyInfo(null);
    setKeyExpired(true);
    toast.info(t("browser.selectedKeyExpired"));
  }, [setKeyInfo, setKeyExpired, t]);

  /** 判断 Key 信息是否表示 Redis 中已不存在 */
  const isExpiredKeyInfo = useCallback(
    (info: NonNullable<typeof keyInfo>) =>
      info.key_type === "none" || info.ttl === -2,
    [],
  );

  /** 选中 Key 时加载详细信息 */
  useEffect(() => {
    if (connectedId && selectedKey) {
      let cancelled = false;
      getKeyInfo(connectedId, selectedDb, selectedKey)
        .then((info) => {
          if (cancelled) return;
          if (isExpiredKeyInfo(info)) {
            handleExpiredKey();
            return;
          }
          setKeyInfo(info);
          setKeyExpired(false);
        })
        .catch(() => {
          if (!cancelled) toast.error(t("browser.loadKeyInfoFailed"));
        });

      return () => {
        cancelled = true;
      };
    }
  }, [
    connectedId,
    handleExpiredKey,
    isExpiredKeyInfo,
    selectedDb,
    selectedKey,
    refreshVersion,
    setKeyInfo,
    setKeyExpired,
    t,
  ]);

  /** 刷新当前 Key 列表 */
  const handleRefresh = useCallback(() => {
    loadKeys(true);
    // 同时刷新 db 信息
    if (connectedId) {
      getDbInfo(connectedId)
        .then((info) => setDbList(info.db_sizes, info.db_count))
        .catch(() => toast.error(t("browser.scanFailed")));
    }
  }, [loadKeys, connectedId, setDbList, t]);

  /** 搜索过滤 */
  const handleSearch = useCallback(() => {
    loadKeys(true);
  }, [loadKeys]);

  /** 刷新当前 Key 的值（编辑后回调） */
  const handleValueChanged = useCallback(() => {
    if (connectedId && selectedKey) {
      getKeyInfo(connectedId, selectedDb, selectedKey)
        .then((info) => {
          if (isExpiredKeyInfo(info)) {
            handleExpiredKey();
            return;
          }
          setKeyInfo(info);
          setKeyExpired(false);
        })
        .catch(() => toast.error(t("browser.loadKeyInfoFailed")));
    }
  }, [
    connectedId,
    handleExpiredKey,
    isExpiredKeyInfo,
    selectedDb,
    selectedKey,
    setKeyInfo,
    setKeyExpired,
    t,
  ]);

  /** 新建或复制 Key 后只更新本地列表，避免重新 SCAN 整个库 */
  const handleKeyCreated = useCallback(
    (entry: KeyEntry) => {
      const existedInLoadedKeys = keys.some((item) => item.key === entry.key);
      if (matchesFilterPattern(entry.key, filterPattern)) {
        upsertKey(entry);
      }
      if (!existedInLoadedKeys) {
        updateDbSize(selectedDb, 1);
      }
      setSelectedKey(entry.key);
      setKeyInfo(null);
      setKeyExpired(false);
    },
    [
      filterPattern,
      keys,
      selectedDb,
      setKeyExpired,
      setKeyInfo,
      setSelectedKey,
      updateDbSize,
      upsertKey,
    ],
  );

  /** 删除 Key 后只移除本地列表项，并按 Redis 返回数量修正 db 计数 */
  const handleKeysDeleted = useCallback(
    (deletedKeys: string[], deletedCount: number) => {
      const deletedSet = new Set(deletedKeys);
      removeKeysFromStore(deletedKeys);
      if (deletedSet.has(selectedKey ?? "")) {
        setSelectedKey(null);
        setKeyInfo(null);
        setKeyExpired(false);
      }
      updateDbSize(selectedDb, -deletedCount);
    },
    [
      removeKeysFromStore,
      selectedDb,
      selectedKey,
      setKeyExpired,
      setKeyInfo,
      setSelectedKey,
      updateDbSize,
    ],
  );

  /** 重命名 Key 后只替换本地列表项，目标名若已存在则同步修正计数 */
  const handleKeyRenamed = useCallback(
    (oldKey: string, newKey: string) => {
      const targetAlreadyLoaded = keys.some((entry) => entry.key === newKey);
      if (matchesFilterPattern(newKey, filterPattern)) {
        renameKeyEntry(oldKey, newKey);
      } else {
        removeKeysFromStore([oldKey]);
      }
      if (targetAlreadyLoaded && oldKey !== newKey) {
        updateDbSize(selectedDb, -1);
      }
      setSelectedKey(newKey);
      setKeyInfo(null);
      setKeyExpired(false);
    },
    [
      filterPattern,
      keys,
      removeKeysFromStore,
      renameKeyEntry,
      selectedDb,
      setKeyExpired,
      setKeyInfo,
      setSelectedKey,
      updateDbSize,
    ],
  );

  /** 快捷键删除选中 Key（⌘D / Delete） */
  const handleDeleteSelectedKey = useCallback(async () => {
    if (!connectedId || !selectedKey) return;
    try {
      const deletedCount = await deleteKeys(connectedId, selectedDb, [
        selectedKey,
      ]);
      toast.success(t("keyDetail.deleteConfirmTitle"));
      handleKeysDeleted([selectedKey], deletedCount);
    } catch {
      toast.error(t("browser.deleteFailed"));
    }
  }, [connectedId, selectedDb, selectedKey, handleKeysDeleted, t]);

  /** 监听 redis:delete-key 自定义事件（由全局快捷键或命令面板触发） */
  useEffect(() => {
    const handler = () => {
      if (selectedKey) {
        setShowDeleteKeyConfirm(true);
      }
    };
    window.addEventListener("redis:delete-key", handler);
    return () => window.removeEventListener("redis:delete-key", handler);
  }, [selectedKey]);

  /** 按收藏过滤后的 Key 列表 */
  const displayKeys = useMemo(() => {
    if (!showFavoritesOnly) return keys;
    return keys.filter((k) => favorites.has(k.key));
  }, [keys, showFavoritesOnly, favorites]);

  /** 定位当前选中的 Key；树形模式会由 KeyTree 自动展开父级目录 */
  const handleLocateSelectedKey = useCallback(() => {
    if (!selectedKey) return;

    const visible = displayKeys.some((entry) => entry.key === selectedKey);
    if (!visible) {
      toast.info(t("browser.selectedKeyHidden"));
      return;
    }

    if (viewMode === "tree") {
      keyTreeRef.current?.locateSelectedKey();
    } else {
      keyListRef.current?.locateSelectedKey();
    }
  }, [displayKeys, selectedKey, t, viewMode]);

  /** 批量删除 */
  const handleBatchDelete = useCallback(async () => {
    if (!connectedId || checkedKeys.size === 0) return;
    const deletedKeys = Array.from(checkedKeys);
    const deletedCount = await deleteKeys(connectedId, selectedDb, deletedKeys);
    clearCheckedKeys();
    handleKeysDeleted(deletedKeys, deletedCount);
  }, [
    connectedId,
    selectedDb,
    checkedKeys,
    clearCheckedKeys,
    handleKeysDeleted,
  ]);

  /** 批量导出 */
  const handleBatchExport = useCallback(async () => {
    if (!connectedId || checkedKeys.size === 0) return;
    try {
      const json = await exportKeys(
        connectedId,
        selectedDb,
        Array.from(checkedKeys),
      );
      // 使用 tauri-plugin-dialog 保存文件
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        const path = await save({
          filters: [{ name: "JSON", extensions: ["json"] }],
          defaultPath: `redis-export-${Date.now()}.json`,
        });
        if (path) await writeTextFile(path, json);
      } else {
        // 浏览器环境 fallback
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `redis-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      toast.error(t("browser.exportFailed"));
    }
  }, [connectedId, selectedDb, checkedKeys, t]);

  /** 全选 / 取消全选 */
  const handleToggleSelectAll = useCallback(() => {
    if (checkedKeys.size === displayKeys.length) {
      clearCheckedKeys();
    } else {
      setCheckedKeys(new Set(displayKeys.map((k) => k.key)));
    }
  }, [checkedKeys.size, displayKeys, clearCheckedKeys, setCheckedKeys]);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* 工具栏 */}
      <KeyToolbar
        onRefresh={handleRefresh}
        onSearch={handleSearch}
        onLocateSelectedKey={handleLocateSelectedKey}
        onKeyCreated={handleKeyCreated}
      />

      {/* 左右分栏 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左栏：Key 列表（可拖拽调宽） */}
        <div
          className="flex flex-col border-r border-border dark:bg-[#0E0E11] shrink-0"
          style={{ width: `${panelWidth}px` }}
        >
          <div className="flex-1 overflow-y-auto">
            {viewMode === "tree" ? (
              <KeyTree
                ref={keyTreeRef}
                keys={displayKeys}
                selectedKey={selectedKey}
                onSelectKey={setSelectedKey}
                loading={loading}
              />
            ) : (
              <KeyList
                ref={keyListRef}
                keys={displayKeys}
                selectedKey={selectedKey}
                onSelectKey={setSelectedKey}
                loading={loading}
              />
            )}
          </div>

          {/* Key 列表底部状态 */}
          <div className="px-4 py-2 text-xs border-t border-border flex justify-between items-center text-zinc-500">
            <span>{t("browser.totalKeys", { count: displayKeys.length })}</span>
            {loading && (
              <span className="text-primary animate-pulse">
                {t("browser.scanning")}
              </span>
            )}
          </div>
        </div>

        {/* 拖拽分隔条 */}
        <div
          className="w-1 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors shrink-0"
          onMouseDown={(e) => {
            isDragging.current = true;
            dragStartX.current = e.clientX;
            dragStartWidth.current = panelWidth;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
        />

        {/* 右栏：值编辑器 */}
        <div className="flex-1 flex flex-col min-w-0 dark:bg-[#151619]">
          {selectedKey && keyInfo ? (
            <>
              <KeyDetail
                keyName={selectedKey}
                keyInfo={keyInfo}
                onDeleted={(key, deletedCount) =>
                  handleKeysDeleted([key], deletedCount)
                }
                onRenamed={handleKeyRenamed}
                onCopied={(key, keyType) =>
                  handleKeyCreated({ key, key_type: keyType })
                }
                onRefresh={handleValueChanged}
              />
              <ValueViewer
                key={`${selectedKey}:${keyInfo.key_type}`}
                keyName={selectedKey}
                keyInfo={keyInfo}
                onValueChanged={handleValueChanged}
              />
            </>
          ) : selectedKey && keyExpired ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Database className="w-12 h-12 opacity-20" />
              <p className="text-sm">{t("browser.selectedKeyExpired")}</p>
            </div>
          ) : selectedKey ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin opacity-40" />
              <p className="text-sm">{t("browser.scanning")}</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Database className="w-12 h-12 opacity-20" />
              <p className="text-sm">{t("browser.selectKey")}</p>
            </div>
          )}
        </div>
      </div>

      {/* 批量操作浮动工具栏 */}
      {checkedKeys.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-t border-border bg-card/95 backdrop-blur-sm">
          <span className="text-sm font-medium">
            {t("browser.batchSelected", { count: checkedKeys.size })}
          </span>
          <Button size="sm" variant="outline" onClick={handleToggleSelectAll}>
            {checkedKeys.size === displayKeys.length ? (
              <>
                <Square className="w-3.5 h-3.5" /> {t("browser.deselectAll")}
              </>
            ) : (
              <>
                <CheckSquare className="w-3.5 h-3.5" /> {t("browser.selectAll")}
              </>
            )}
          </Button>
          <div className="flex-1" />
          <Button size="sm" variant="outline" onClick={handleBatchExport}>
            <Download className="w-3.5 h-3.5" />
            {t("browser.batchExport", { count: checkedKeys.size })}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowBatchDeleteConfirm(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t("browser.batchDelete", { count: checkedKeys.size })}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={clearCheckedKeys}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 批量删除确认对话框 */}
      <ConfirmDangerDialog
        isOpen={showBatchDeleteConfirm}
        onClose={() => setShowBatchDeleteConfirm(false)}
        onConfirm={handleBatchDelete}
        title={t("browser.batchDeleteTitle")}
        message={t("browser.batchDeleteConfirm", { count: checkedKeys.size })}
        confirmText="DELETE"
      />

      {/* 快捷键删除选中 Key 确认对话框 */}
      <ConfirmDangerDialog
        isOpen={showDeleteKeyConfirm}
        onClose={() => setShowDeleteKeyConfirm(false)}
        onConfirm={handleDeleteSelectedKey}
        title={t("keyDetail.deleteConfirmTitle")}
        message={t("keyDetail.deleteConfirm", { key: selectedKey ?? "" })}
        confirmText="DELETE"
      />
    </div>
  );
}
