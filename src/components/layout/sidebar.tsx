"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
import { addToast } from "@heroui/toast";
import { useAppStore } from "@/stores/app-store";
import { useConnectionStore, type ConnectionConfig } from "@/stores/connection-store";
import { useBrowserStore, type DbSize } from "@/stores/browser-store";
import { ExportConnectionsDialog } from "@/components/connection/export-connections-dialog";
import { ImportConnectionsDialog } from "@/components/connection/import-connections-dialog";
import {
  listConnections,
  connectRedis,
  disconnectRedis,
  deleteConnection as deleteConnectionApi,
  saveConnection,
  getDbInfo,
} from "@/lib/tauri-api";

function DatabaseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function RadioIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M13.06 7.34A16 16 0 0 1 19 10" />
      <path d="M2 12.95A10 10 0 0 1 8 6" />
      <path d="M5 19.5A14 14 0 0 1 2 12.95" />
      <circle cx="12" cy="17" r="1" />
      <path d="M9 15a3 3 0 0 1 6 0" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ImportExportIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${collapsed ? "rotate-180" : ""}`}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

/** 右键菜单 */
interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  connectionId: string | null;
}

/** 连接列表项组件 */
function ConnectionItem({ connection }: { connection: ConnectionConfig }) {
  const { t } = useTranslation();
  const {
    connectionStatus,
    activeConnectionId,
    setActiveConnection,
    setConnectionStatus,
    setConnections,
    openDialog,
  } = useConnectionStore();
  const { selectedDb, setSelectedDb, setConnectionId, resetBrowser, setDbList } =
    useBrowserStore();
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    connectionId: null,
  });
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
        if (isActive) {
          setDbList(info.db_sizes, info.db_count);
        }
      })
      .catch(console.error);
  }, [isConnected, connection.id, isActive, setDbList]);

  /** 右键菜单 */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, connectionId: connection.id });
    },
    [connection.id]
  );

  /** 点击选中连接 */
  const handleClick = useCallback(() => {
    setActiveConnection(connection.id);
  }, [connection.id, setActiveConnection]);

  /** 双击连接/断开 */
  const handleDoubleClick = useCallback(async () => {
    if (status === "connected") {
      setConnectionStatus(connection.id, "disconnected");
      await disconnectRedis(connection.id);
    } else {
      setConnectionStatus(connection.id, "connecting");
      try {
        await connectRedis(connection.id);
        setConnectionStatus(connection.id, "connected");
        setActiveConnection(connection.id);
        setConnectionId(connection.id);
      } catch (err) {
        setConnectionStatus(connection.id, "disconnected");
        addToast({
          title: t("connection.testFailed"),
          description: err instanceof Error ? err.message : String(err),
          color: "danger",
          timeout: 5000,
        });
      }
    }
  }, [connection.id, status, setConnectionStatus, setActiveConnection, setConnectionId, t]);

  /** 关闭右键菜单 */
  useEffect(() => {
    if (!contextMenu.visible) return;
    const handleClickOutside = () => setContextMenu((prev) => ({ ...prev, visible: false }));
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [contextMenu.visible]);

  /** 菜单操作 */
  const menuActions = {
    connect: async () => {
      setConnectionStatus(connection.id, "connecting");
      try {
        await connectRedis(connection.id);
        setConnectionStatus(connection.id, "connected");
        setActiveConnection(connection.id);
        setConnectionId(connection.id);
      } catch (err) {
        setConnectionStatus(connection.id, "disconnected");
        addToast({
          title: t("connection.testFailed"),
          description: err instanceof Error ? err.message : String(err),
          color: "danger",
          timeout: 5000,
        });
      }
    },
    disconnect: async () => {
      await disconnectRedis(connection.id);
      setConnectionStatus(connection.id, "disconnected");
    },
    edit: () => openDialog(connection),
    duplicate: async () => {
      const dup: ConnectionConfig = {
        ...connection,
        id: crypto.randomUUID(),
        name: `${connection.name} (${t("actions.copy")})`,
      };
      await saveConnection(dup);
      const updated = await listConnections();
      setConnections(updated);
    },
    delete: async () => {
      if (confirm(t("connection.deleteConfirm", { name: connection.name }))) {
        await deleteConnectionApi(connection.id);
        const updated = await listConnections();
        setConnections(updated);
      }
    },
  };

  return (
    <>
      <button
        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors ${
          isActive ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400" : "hover:bg-default-100"
        }`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {/* 状态指示器 */}
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            status === "connected"
              ? "bg-success"
              : status === "connecting"
                ? "bg-warning animate-pulse"
                : "bg-default-300"
          }`}
        />
        <span className="truncate flex-1 text-left">{connection.name || `${connection.host}:${connection.port}`}</span>
        <span className="text-default-400 text-xs shrink-0">
          {connection.host}:{connection.port}
        </span>
      </button>

      {/* 已连接时显示 db 子列表 */}
      {isConnected && (
        <div className="ml-5 mt-0.5 space-y-0.5">
          {Array.from({ length: Math.min(dbCount, 16) }, (_, i) => {
            const info = dbSizes.find((d) => d.db === i);
            const size = info?.size ?? 0;
            const isSelectedDb = isActive && selectedDb === i;
            return (
              <button
                key={i}
                className={`px-2 py-1 rounded-md text-xs cursor-pointer flex justify-between items-center w-full transition-colors ${
                  isSelectedDb
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                    : "hover:bg-default-100 text-default-500"
                }`}
                onClick={() => {
                  setActiveConnection(connection.id);
                  setConnectionId(connection.id);
                  setSelectedDb(i);
                  resetBrowser();
                }}
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
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[160px] bg-content1 border border-divider rounded-lg shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {status !== "connected" ? (
            <ContextMenuItem onClick={menuActions.connect}>{t("connection.connect")}</ContextMenuItem>
          ) : (
            <ContextMenuItem onClick={menuActions.disconnect}>{t("connection.disconnect")}</ContextMenuItem>
          )}
          <div className="h-px bg-divider my-1" />
          <ContextMenuItem onClick={menuActions.edit}>{t("actions.edit")}</ContextMenuItem>
          <ContextMenuItem onClick={menuActions.duplicate}>{t("connection.duplicate")}</ContextMenuItem>
          <div className="h-px bg-divider my-1" />
          <ContextMenuItem onClick={menuActions.delete} danger>
            {t("actions.delete")}
          </ContextMenuItem>
        </div>
      )}
    </>
  );
}

/** 右键菜单项 */
function ContextMenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
        danger
          ? "text-danger hover:bg-danger-50"
          : "text-foreground hover:bg-default-100"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** 侧边栏底部导航按钮 — 切换主内容区视图 */
function SidebarNavButton({
  icon,
  label,
  view,
  alwaysEnabled,
}: {
  icon: React.ReactNode;
  label: string;
  view: "browser" | "cli" | "monitor" | "pubsub" | "settings";
  /** 无需连接即可使用 */
  alwaysEnabled?: boolean;
}) {
  const { mainView, setMainView } = useAppStore();
  const { activeConnectionId, connectionStatus } = useConnectionStore();
  const isConnected =
    activeConnectionId !== null &&
    connectionStatus[activeConnectionId] === "connected";
  const isActive = mainView === view;
  const enabled = alwaysEnabled || isConnected;

  return (
    <button
      className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors ${
        isActive && enabled
          ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
          : "text-default-500 hover:bg-default-100"
      } ${!enabled ? "opacity-50 cursor-not-allowed" : ""}`}
      onClick={() => {
        if (enabled) setMainView(view);
      }}
      disabled={!enabled}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/** 左侧边栏组件 — 连接列表 */
export function Sidebar() {
  const { t } = useTranslation();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const { connections, setConnections, openDialog } = useConnectionStore();
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  /** 初始化加载连接列表 */
  useEffect(() => {
    listConnections().then(setConnections).catch(console.error);
  }, [setConnections]);

  if (sidebarCollapsed) {
    return (
      <aside className="w-10 border-r border-divider bg-content1 flex flex-col items-center pt-2 shrink-0">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-default-100 transition-colors"
        >
          <ChevronIcon collapsed={true} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-60 border-r border-divider bg-content1 flex flex-col shrink-0">
      {/* 侧边栏头部 */}
      <div className="flex items-center justify-between h-10 px-3 border-b border-divider">
        <button
          className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors"
          onClick={() => {
            const { mainView, setMainView } = useAppStore.getState();
            if (mainView !== "browser") setMainView("browser");
          }}
        >
          <DatabaseIcon />
          <span>{t("connection.title")}</span>
        </button>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowImport(true)}
            className="p-1 rounded-md hover:bg-default-100 transition-colors text-default-500"
            title={t("connection.importConnections")}
          >
            <ImportExportIcon />
          </button>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md hover:bg-default-100 transition-colors"
          >
            <ChevronIcon collapsed={false} />
          </button>
        </div>
      </div>

      {/* 新建连接按钮 */}
      <div className="p-2">
        <Button
          color="primary"
          className="w-full"
          size="sm"
          startContent={<PlusIcon />}
          onPress={() => openDialog()}
        >
          {t("connection.new")}
        </Button>
      </div>

      {/* 连接列表 */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-default-400 text-xs text-center px-4">
            <DatabaseIcon />
            <p className="mt-2">{t("connection.noConnections")}</p>
            <p className="mt-1 text-default-300">{t("connection.noConnectionsDesc")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {connections.map((conn) => (
              <ConnectionItem key={conn.id} connection={conn} />
            ))}
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <div className="border-t border-divider shrink-0">
        <SidebarNavButton
          icon={<TerminalIcon />}
          label={t("cli.title")}
          view="cli"
        />
        <SidebarNavButton
          icon={<ActivityIcon />}
          label={t("monitor.title")}
          view="monitor"
        />
        <SidebarNavButton
          icon={<RadioIcon />}
          label={t("pubsub.title")}
          view="pubsub"
        />
        <SidebarNavButton
          icon={<SettingsIcon />}
          label={t("actions.settings")}
          view="settings"
          alwaysEnabled
        />
      </div>

      {/* 导出/导入对话框 */}
      <ExportConnectionsDialog isOpen={showExport} onClose={() => setShowExport(false)} />
      <ImportConnectionsDialog isOpen={showImport} onClose={() => setShowImport(false)} />
    </aside>
  );
}
