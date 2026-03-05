"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useEffect } from "react";
import { useBrowserStore } from "@/stores/browser-store";
import { useConnectionStore } from "@/stores/connection-store";
import { scanKeys, getDbInfo, getKeyInfo } from "@/lib/tauri-api";
import { KeyToolbar } from "./key-toolbar";
import { KeyTree } from "./key-tree";
import { KeyList } from "./key-list";
import { KeyDetail } from "./key-detail";
import { ValueViewer } from "./value-viewer";
import { Database } from "lucide-react";

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

  const connectedId =
    activeConnectionId && connectionStatus[activeConnectionId] === "connected"
      ? activeConnectionId
      : null;

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

  /** 加载 Key 列表 */
  const loadKeys = useCallback(
    async (reset = false) => {
      if (!connectedId) return;
      setLoading(true);
      try {
        const cursor = reset ? 0 : scanCursor;
        const result = await scanKeys(
          connectedId,
          selectedDb,
          cursor,
          filterPattern || "*",
          200
        );
        if (reset) {
          setKeys(result.keys);
        } else {
          appendKeys(result.keys);
        }
        setScanCursor(result.cursor);
        setScanComplete(result.cursor === 0);
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
      filterPattern,
      setKeys,
      appendKeys,
      setScanCursor,
      setScanComplete,
      setLoading,
    ]
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
    if (connectedId && selectedKey) {
      getKeyInfo(connectedId, selectedDb, selectedKey)
        .then(setKeyInfo)
        .catch(console.error);
    } else {
      setKeyInfo(null);
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

  /** 加载更多 */
  const handleLoadMore = useCallback(() => {
    if (!scanComplete && !loading) {
      loadKeys(false);
    }
  }, [scanComplete, loading, loadKeys]);

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

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* 工具栏 */}
      <KeyToolbar onRefresh={handleRefresh} onSearch={handleSearch} />

      {/* 左右分栏 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左栏：Key 列表 */}
        <div className="w-72 flex flex-col border-r border-border dark:bg-[#0E0E11]">
          <div className="flex-1 overflow-y-auto">
            {viewMode === "tree" ? (
              <KeyTree
                keys={keys}
                selectedKey={selectedKey}
                onSelectKey={setSelectedKey}
              />
            ) : (
              <KeyList
                keys={keys}
                selectedKey={selectedKey}
                onSelectKey={setSelectedKey}
              />
            )}
          </div>

          {/* Key 列表底部状态 */}
          <div className="px-4 py-2 text-xs border-t border-border flex justify-between items-center text-zinc-500">
            <span>{t("browser.totalKeys", { count: keys.length })}</span>
            {!scanComplete && (
              <button
                onClick={handleLoadMore}
                className="text-primary hover:underline"
                disabled={loading}
              >
                {loading ? "..." : t("browser.scanMore")}
              </button>
            )}
          </div>
        </div>

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
    </div>
  );
}
