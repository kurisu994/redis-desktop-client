"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { useConnectionStore, type ConnectionConfig } from "@/stores/connection-store";
import { useBrowserStore, type DbSize } from "@/stores/browser-store";
import {
  connectRedis,
  disconnectRedis,
  deleteConnection as deleteConnectionApi,
  saveConnection,
  listConnections,
  getDbInfo,
} from "@/lib/tauri-api";
import type { DragProps } from "@/hooks/use-connection-drag";

/** 右键菜单项 */
function ContextMenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
        danger ? "text-destructive hover:bg-destructive/10" : "text-foreground hover:bg-accent"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** 连接列表项组件 */
export function ConnectionItem({ connection, dragProps }: { connection: ConnectionConfig; dragProps: DragProps }) {
  const { t } = useTranslation();
  const { connectionStatus, activeConnectionId, setActiveConnection, setConnectionStatus, setConnections, openDialog } =
    useConnectionStore();
  const { selectedDb, setSelectedDb, setConnectionId, resetBrowser, setDbList } = useBrowserStore();
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number }>({ visible: false, x: 0, y: 0 });
  const [dbSizes, setDbSizes] = useState<DbSize[]>([]);
  const [dbCount, setDbCount] = useState(16);
  const menuRef = useRef<HTMLDivElement>(null);

  const status = connectionStatus[connection.id] || "disconnected";
  const isActive = activeConnectionId === connection.id;
  const isConnected = status === "connected";

  /** 连接成功后加载 db 信息 */
  useEffect(() => {
    if (!isConnected) return;
    getDbInfo(connection.id)
      .then((info) => {
        setDbSizes(info.db_sizes);
        setDbCount(info.db_count);
        if (isActive) setDbList(info.db_sizes, info.db_count);
      })
      .catch(console.error);
  }, [isConnected, connection.id, isActive, setDbList]);

  /** 连接 Redis */
  const doConnect = useCallback(async () => {
    setConnectionStatus(connection.id, "connecting");
    try {
      await connectRedis(connection.id);
      setConnectionStatus(connection.id, "connected");
      setActiveConnection(connection.id);
      setConnectionId(connection.id);
    } catch (err) {
      setConnectionStatus(connection.id, "disconnected");
      toast.error(t("connection.testFailed"), { description: err instanceof Error ? err.message : String(err) });
    }
  }, [connection.id, setConnectionStatus, setActiveConnection, setConnectionId, t]);

  /** 双击连接/断开 */
  const handleDoubleClick = useCallback(async () => {
    if (isConnected) {
      setConnectionStatus(connection.id, "disconnected");
      await disconnectRedis(connection.id);
    } else {
      await doConnect();
    }
  }, [connection.id, isConnected, setConnectionStatus, doConnect]);

  /** 关闭右键菜单 */
  useEffect(() => {
    if (!contextMenu.visible) return;
    const close = () => setContextMenu((prev) => ({ ...prev, visible: false }));
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [contextMenu.visible]);

  /** 菜单操作 */
  const menuActions = {
    connect: doConnect,
    disconnect: async () => {
      await disconnectRedis(connection.id);
      setConnectionStatus(connection.id, "disconnected");
    },
    edit: () => openDialog(connection),
    duplicate: async () => {
      const dup: ConnectionConfig = { ...connection, id: crypto.randomUUID(), name: `${connection.name} (${t("actions.copy")})` };
      await saveConnection(dup);
      setConnections(await listConnections());
    },
    delete: async () => {
      if (confirm(t("connection.deleteConfirm", { name: connection.name }))) {
        await deleteConnectionApi(connection.id);
        setConnections(await listConnections());
      }
    },
  };

  return (
    <>
      {/* 可拖拽的连接按钮 */}
      <div
        className={`relative ${dragProps.isDragOver && dragProps.dragOverPosition === "above" ? "before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5 before:bg-primary before:rounded-full" : ""} ${dragProps.isDragOver && dragProps.dragOverPosition === "below" ? "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:rounded-full" : ""}`}
        draggable
        onDragStart={(e) => dragProps.onDragStart(e, connection.id)}
        onDragOver={(e) => dragProps.onDragOver(e, connection.id)}
        onDragEnd={dragProps.onDragEnd}
        onDrop={(e) => dragProps.onDrop(e, connection.id)}
      >
        <button
          className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors ${isActive ? "bg-primary/10 text-primary" : "hover:bg-accent"}`}
          onClick={() => setActiveConnection(connection.id)}
          onDoubleClick={handleDoubleClick}
          onContextMenu={(e) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY }); }}
        >
          <span className={`w-2 h-2 rounded-full shrink-0 ${status === "connected" ? "bg-green-500" : status === "connecting" ? "bg-yellow-500 animate-pulse" : "bg-muted-foreground/30"}`} />
          <span className="truncate flex-1 text-left">{connection.name || `${connection.host}:${connection.port}`}</span>
          <span className="text-muted-foreground text-xs shrink-0">{connection.host}:{connection.port}</span>
        </button>
      </div>

      {/* 已连接时显示 db 子列表 */}
      {isConnected && (
        <div className="ml-5 mt-0.5 space-y-0.5">
          {Array.from({ length: Math.min(dbCount, 16) }, (_, i) => {
            const size = dbSizes.find((d) => d.db === i)?.size ?? 0;
            const isSelectedDb = isActive && selectedDb === i;
            return (
              <button
                key={i}
                className={`px-2 py-1 rounded-md text-xs cursor-pointer flex justify-between items-center w-full transition-colors ${isSelectedDb ? "bg-primary/10 text-primary" : "hover:bg-accent text-muted-foreground"}`}
                onClick={() => { setActiveConnection(connection.id); setConnectionId(connection.id); setSelectedDb(i); resetBrowser(); useAppStore.getState().activateTab("browser"); }}
              >
                <span>db{i}</span>
                <span className="opacity-60">{size}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 右键菜单 */}
      {contextMenu.visible && (
        <div ref={menuRef} className="fixed z-50 min-w-[160px] bg-popover border rounded-lg shadow-lg py-1" style={{ left: contextMenu.x, top: contextMenu.y }}>
          {!isConnected ? (
            <ContextMenuItem onClick={menuActions.connect}>{t("connection.connect")}</ContextMenuItem>
          ) : (
            <ContextMenuItem onClick={menuActions.disconnect}>{t("connection.disconnect")}</ContextMenuItem>
          )}
          <div className="h-px bg-border my-1" />
          <ContextMenuItem onClick={menuActions.edit}>{t("actions.edit")}</ContextMenuItem>
          <ContextMenuItem onClick={menuActions.duplicate}>{t("connection.duplicate")}</ContextMenuItem>
          <div className="h-px bg-border my-1" />
          <ContextMenuItem onClick={menuActions.delete} danger>{t("actions.delete")}</ContextMenuItem>
        </div>
      )}
    </>
  );
}
