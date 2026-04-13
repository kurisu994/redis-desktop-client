"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBrowserStore } from "@/stores/browser-store";
import { useConnectionStore } from "@/stores/connection-store";
import {
  scanKeys,
  getDbInfo,
  getKeyInfo,
  deleteKeys,
  exportKeys,
} from "@/lib/tauri-api";
import { KeyToolbar } from "./key-toolbar";
import { KeyTree } from "./key-tree";
import { KeyList } from "./key-list";
import { KeyDetail } from "./key-detail";
import { ValueViewer } from "./value-viewer";
import { Button } from "@/components/ui/button";
import {
  Database,
  Trash2,
  Download,
  X,
  CheckSquare,
  Square,
} from "lucide-react";
import { ConfirmDangerDialog } from "@/components/confirm-danger-dialog";
import { toast } from "sonner";

/** 数据浏览器主容器 — 工具栏 + 左右分栏（Key 列表 + 值编辑器） */
export function DataBrowser() {
  const { t } = useTranslation();
  const { activeConnectionId, connectionStatus } = useConnectionStore();
  const {
    connectionId,
    selectedDb,
    keys,
    scanCursor,
    scanComplete,
    selectedKey,
    keyInfo,
    viewMode,
    filterPattern,
    loading,
    checkedKeys,
    clearCheckedKeys,
    setCheckedKeys,
    showFavoritesOnly,
    favorites,
    setFavorites,
    setConnectionId,
    setKeys,
    appendKeys,
    setScanCursor,
    setScanComplete,
    setSelectedKey,
    setKeyInfo,
    setLoading,
    setDbList,
    resetBrowser,
  } = useBrowserStore();

  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showDeleteKeyConfirm, setShowDeleteKeyConfirm] = useState(false);

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
        .catch(console.error);
    } else if (!connectedId) {
      setConnectionId(null);
      resetBrowser();
    }
  }, [connectedId, connectionId, setConnectionId, resetBrowser, setDbList]);

  /** 加载 Key 列表 — 自动分片加载全部 Key */
  const loadKeys = useCallback(
    async (reset = false) => {
      if (!connectedId) return;
      setLoading(true);
      try {
        let cursor = reset ? 0 : scanCursor;
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
          cursor = result.cursor;
          setScanCursor(cursor);
          setScanComplete(cursor === 0);
          // 自动继续加载剩余批次
          while (cursor !== 0) {
            const next = await scanKeys(
              connectedId,
              selectedDb,
              cursor,
              filterPattern || "*",
              200,
            );
            appendKeys(next.keys);
            cursor = next.cursor;
            setScanCursor(cursor);
            setScanComplete(cursor === 0);
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
      } catch (err) {
        console.error("扫描 Key 失败:", err);
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
    ],
  );

  /** db 切换或连接初始化后自动加载 Key */
  useEffect(() => {
    if (connectedId) {
      loadKeys(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedId, selectedDb]);

  /** 选中 Key 时加载详细信息 */
  useEffect(() => {
    // keyInfo 已在 setSelectedKey 中同步清空，避免旧类型导致 WRONGTYPE
    if (connectedId && selectedKey) {
      getKeyInfo(connectedId, selectedDb, selectedKey)
        .then(setKeyInfo)
        .catch(console.error);
    }
  }, [connectedId, selectedDb, selectedKey, setKeyInfo]);

  /** 刷新当前 Key 列表 */
  const handleRefresh = useCallback(() => {
    loadKeys(true);
    // 同时刷新 db 信息
    if (connectedId) {
      getDbInfo(connectedId)
        .then((info) => setDbList(info.db_sizes, info.db_count))
        .catch(console.error);
    }
  }, [loadKeys, connectedId, setDbList]);

  /** 搜索过滤 */
  const handleSearch = useCallback(() => {
    loadKeys(true);
  }, [loadKeys]);

  /** 刷新当前 Key 的值（编辑后回调） */
  const handleValueChanged = useCallback(() => {
    if (connectedId && selectedKey) {
      getKeyInfo(connectedId, selectedDb, selectedKey)
        .then(setKeyInfo)
        .catch(console.error);
    }
  }, [connectedId, selectedDb, selectedKey, setKeyInfo]);

  /** Key 被删除后的回调 */
  const handleKeyDeleted = useCallback(() => {
    setSelectedKey(null);
    setKeyInfo(null);
    loadKeys(true);
  }, [setSelectedKey, setKeyInfo, loadKeys]);

  /** 快捷键删除选中 Key（⌘D / Delete） */
  const handleDeleteSelectedKey = useCallback(async () => {
    if (!connectedId || !selectedKey) return;
    try {
      await deleteKeys(connectedId, selectedDb, [selectedKey]);
      toast.success(t("keyDetail.deleteConfirmTitle"));
      handleKeyDeleted();
      // 刷新 db 信息
      getDbInfo(connectedId)
        .then((info) => setDbList(info.db_sizes, info.db_count))
        .catch(console.error);
    } catch (err) {
      console.error("删除 Key 失败:", err);
    }
  }, [connectedId, selectedDb, selectedKey, handleKeyDeleted, setDbList, t]);

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

  /** 批量删除 */
  const handleBatchDelete = useCallback(async () => {
    if (!connectedId || checkedKeys.size === 0) return;
    await deleteKeys(connectedId, selectedDb, Array.from(checkedKeys));
    clearCheckedKeys();
    setSelectedKey(null);
    setKeyInfo(null);
    loadKeys(true);
    if (connectedId) {
      getDbInfo(connectedId)
        .then((info) => setDbList(info.db_sizes, info.db_count))
        .catch(console.error);
    }
  }, [
    connectedId,
    selectedDb,
    checkedKeys,
    clearCheckedKeys,
    setSelectedKey,
    setKeyInfo,
    loadKeys,
    setDbList,
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
    } catch (err) {
      console.error("批量导出失败:", err);
    }
  }, [connectedId, selectedDb, checkedKeys]);

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
      <KeyToolbar onRefresh={handleRefresh} onSearch={handleSearch} />

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
                keys={displayKeys}
                selectedKey={selectedKey}
                onSelectKey={setSelectedKey}
                loading={loading}
              />
            ) : (
              <KeyList
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
                onDeleted={handleKeyDeleted}
                onRefresh={handleValueChanged}
              />
              <ValueViewer
                key={`${selectedKey}:${keyInfo.key_type}`}
                keyName={selectedKey}
                keyInfo={keyInfo}
                onValueChanged={handleValueChanged}
              />
            </>
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
