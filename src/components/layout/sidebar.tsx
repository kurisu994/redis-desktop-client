"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import { useConnectionStore, type ConnectionConfig } from "@/stores/connection-store";
import { useBrowserStore, type DbSize } from "@/stores/browser-store";
import { ExportConnectionsDialog } from "@/components/connection/export-connections-dialog";
import { ImportConnectionsDialog } from "@/components/connection/import-connections-dialog";
import {
  Plus, Database, Terminal, Activity, Radio, Download, ChevronLeft, ChevronRight, FolderOpen, Folder,
} from "lucide-react";
import {
  listConnections,
  connectRedis,
  disconnectRedis,
  deleteConnection as deleteConnectionApi,
  saveConnection,
  getDbInfo,
} from "@/lib/tauri-api";

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
  const { connectionStatus, activeConnectionId, setActiveConnection, setConnectionStatus, setConnections, openDialog, getGroups } =
    useConnectionStore();
  const { selectedDb, setSelectedDb, setConnectionId, resetBrowser, setDbList } = useBrowserStore();
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    connectionId: null,
  });
  /** 是否展示"移动到分组"子菜单 */
  const [showGroupSubmenu, setShowGroupSubmenu] = useState(false);
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
    [connection.id],
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
        toast.error(t("connection.testFailed"), {
          description: err instanceof Error ? err.message : String(err),
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
        toast.error(t("connection.testFailed"), {
          description: err instanceof Error ? err.message : String(err),
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
    /** 移动到指定分组 */
    moveToGroup: async (groupName: string | undefined) => {
      const updated = { ...connection, group: groupName };
      await saveConnection(updated);
      const list = await listConnections();
      setConnections(list);
      setContextMenu((prev) => ({ ...prev, visible: false }));
    },
  };

  /** 已有分组列表 */
  const existingGroups = getGroups();

  return (
    <>
      <button
        className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors ${
          isActive
            ? "bg-primary/10 text-primary"
            : "hover:bg-accent"
        }`}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {/* 状态指示器 */}
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            status === "connected"
              ? "bg-green-500"
              : status === "connecting"
                ? "bg-yellow-500 animate-pulse"
                : "bg-muted-foreground/30"
          }`}
        />
        <span className="truncate flex-1 text-left">{connection.name || `${connection.host}:${connection.port}`}</span>
        <span className="text-muted-foreground text-xs shrink-0">
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
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent text-muted-foreground"
                }`}
                onClick={() => {
                  setActiveConnection(connection.id);
                  setConnectionId(connection.id);
                  setSelectedDb(i);
                  resetBrowser();
                  useAppStore.getState().activateTab("browser");
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
          className="fixed z-50 min-w-[160px] bg-popover border rounded-lg shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {status !== "connected" ? (
            <ContextMenuItem onClick={menuActions.connect}>{t("connection.connect")}</ContextMenuItem>
          ) : (
            <ContextMenuItem onClick={menuActions.disconnect}>{t("connection.disconnect")}</ContextMenuItem>
          )}
          <div className="h-px bg-border my-1" />
          <ContextMenuItem onClick={menuActions.edit}>{t("actions.edit")}</ContextMenuItem>
          <ContextMenuItem onClick={menuActions.duplicate}>{t("connection.duplicate")}</ContextMenuItem>
          {/* 移动到分组 */}
          <div
            className="relative"
            onMouseEnter={() => setShowGroupSubmenu(true)}
            onMouseLeave={() => setShowGroupSubmenu(false)}
          >
            <button
              className="w-full text-left px-3 py-1.5 text-sm transition-colors text-foreground hover:bg-accent flex items-center justify-between"
            >
              <span>{t("connection.moveToGroup")}</span>
              <ChevronRight size={14} className="text-muted-foreground" />
            </button>
            {showGroupSubmenu && (
              <div className="absolute left-full top-0 min-w-[120px] bg-popover border rounded-lg shadow-lg py-1 ml-1">
                {/* 移出分组（无分组） */}
                <ContextMenuItem
                  onClick={() => menuActions.moveToGroup(undefined)}
                  active={!connection.group}
                >
                  {t("connection.noGroup")}
                </ContextMenuItem>
                {existingGroups.length > 0 && <div className="h-px bg-border my-1" />}
                {existingGroups.map((g) => (
                  <ContextMenuItem
                    key={g}
                    onClick={() => menuActions.moveToGroup(g)}
                    active={connection.group === g}
                  >
                    {g}
                  </ContextMenuItem>
                ))}
              </div>
            )}
          </div>
          <div className="h-px bg-border my-1" />
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
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
        danger
          ? "text-destructive hover:bg-destructive/10"
          : active
            ? "text-primary bg-primary/10"
            : "text-foreground hover:bg-accent"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** 侧边栏底部导航按钮 — 打开或激活对应 Tab */
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
  const { tabs, activeTabId, openTab } = useAppStore();
  const { activeConnectionId, connectionStatus } = useConnectionStore();
  const isConnected = activeConnectionId !== null && connectionStatus[activeConnectionId] === "connected";
  // 检查当前活跃 Tab 是否为该类型
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isActive = activeTab?.type === view;
  const enabled = alwaysEnabled || isConnected;

  return (
    <button
      className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-colors ${
        isActive && enabled
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent"
      } ${!enabled ? "opacity-50 cursor-not-allowed" : ""}`}
      onClick={() => {
        if (enabled) openTab(view);
      }}
      disabled={!enabled}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/** 分组标题组件 */
function GroupHeader({ groupName, isCollapsed, onToggle, count }: {
  groupName: string;
  isCollapsed: boolean;
  onToggle: () => void;
  count: number;
}) {
  return (
    <button
      className="flex items-center gap-1.5 w-full px-1 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      onClick={onToggle}
    >
      {isCollapsed ? <Folder size={14} /> : <FolderOpen size={14} />}
      <span className="truncate flex-1 text-left">{groupName}</span>
      <span className="text-muted-foreground/60 text-xs">{count}</span>
    </button>
  );
}

/** 左侧边栏组件 — 连接列表 */
export function Sidebar() {
  const { t } = useTranslation();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const { connections, setConnections, openDialog, collapsedGroups, toggleGroupCollapse } = useConnectionStore();
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  /** 初始化加载连接列表 */
  useEffect(() => {
    listConnections().then(setConnections).catch(console.error);
  }, [setConnections]);

  /** 按分组归类连接 */
  const groupedConnections = useMemo(() => {
    const groups = new Map<string, ConnectionConfig[]>();
    const ungrouped: ConnectionConfig[] = [];

    connections.forEach((conn) => {
      if (conn.group) {
        const existing = groups.get(conn.group) || [];
        existing.push(conn);
        groups.set(conn.group, existing);
      } else {
        ungrouped.push(conn);
      }
    });

    // 分组按字母排序
    const sortedGroups = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
    return { sortedGroups, ungrouped };
  }, [connections]);

  /** 是否有分组（仅当存在至少一个分组时才显示分组 UI） */
  const hasGroups = groupedConnections.sortedGroups.length > 0;

  if (sidebarCollapsed) {
    return (
      <aside className="w-10 border-r bg-card flex flex-col items-center pt-2 shrink-0">
        <button onClick={toggleSidebar} className="p-1.5 rounded-md hover:bg-accent transition-colors">
          <ChevronLeft className="w-4 h-4 rotate-180" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-60 border-r bg-card flex flex-col shrink-0">
      {/* 侧边栏头部 */}
      <div className="flex items-center justify-between h-10 px-3 border-b">
        <button
          className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors"
          onClick={() => {
            useAppStore.getState().activateTab("browser");
          }}
        >
          <Database size={16} />
          <span>{t("connection.title")}</span>
        </button>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setShowImport(true)}
            className="p-1 rounded-md hover:bg-accent transition-colors text-muted-foreground"
            title={t("connection.importConnections")}
          >
            <Download size={14} />
          </button>
          <button onClick={toggleSidebar} className="p-1 rounded-md hover:bg-accent transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 新建连接按钮 */}
      <div className="p-2">
        <Button className="w-full" size="sm" onClick={() => openDialog()}>
          <Plus size={14} />
          {t("connection.new")}
        </Button>
      </div>

      {/* 连接列表 */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs text-center px-4">
            <Database size={16} />
            <p className="mt-2">{t("connection.noConnections")}</p>
            <p className="mt-1 opacity-60">{t("connection.noConnectionsDesc")}</p>
          </div>
        ) : hasGroups ? (
          /* 分组模式 */
          <div className="flex flex-col gap-1">
            {/* 各分组 */}
            {groupedConnections.sortedGroups.map(([groupName, conns]) => {
              const isCollapsed = collapsedGroups.has(groupName);
              return (
                <div key={groupName}>
                  <GroupHeader
                    groupName={groupName}
                    isCollapsed={isCollapsed}
                    onToggle={() => toggleGroupCollapse(groupName)}
                    count={conns.length}
                  />
                  {!isCollapsed && (
                    <div className="flex flex-col gap-0.5 ml-1">
                      {conns.map((conn) => (
                        <ConnectionItem key={conn.id} connection={conn} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {/* 未分组连接 */}
            {groupedConnections.ungrouped.length > 0 && (
              <div>
                <GroupHeader
                  groupName={t("connection.noGroup")}
                  isCollapsed={collapsedGroups.has("__ungrouped__")}
                  onToggle={() => toggleGroupCollapse("__ungrouped__")}
                  count={groupedConnections.ungrouped.length}
                />
                {!collapsedGroups.has("__ungrouped__") && (
                  <div className="flex flex-col gap-0.5 ml-1">
                    {groupedConnections.ungrouped.map((conn) => (
                      <ConnectionItem key={conn.id} connection={conn} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* 无分组 — 扁平列表 */
          <div className="flex flex-col gap-0.5">
            {connections.map((conn) => (
              <ConnectionItem key={conn.id} connection={conn} />
            ))}
          </div>
        )}
      </div>

      {/* 底部导航 */}
      <div className="border-t shrink-0">
        <SidebarNavButton icon={<Terminal size={16} />} label={t("cli.title")} view="cli" />
        <SidebarNavButton icon={<Activity size={16} />} label={t("monitor.title")} view="monitor" />
        <SidebarNavButton icon={<Radio size={16} />} label={t("pubsub.title")} view="pubsub" />
      </div>

      {/* 导出/导入对话框 */}
      <ExportConnectionsDialog isOpen={showExport} onClose={() => setShowExport(false)} />
      <ImportConnectionsDialog isOpen={showImport} onClose={() => setShowImport(false)} />
    </aside>
  );
}
