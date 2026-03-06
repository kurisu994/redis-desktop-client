"use client";

import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { useConnectionStore } from "@/stores/connection-store";
import { ExportConnectionsDialog } from "@/components/connection/export-connections-dialog";
import { ImportConnectionsDialog } from "@/components/connection/import-connections-dialog";
import { ConnectionItem } from "@/components/layout/connection-item";
import { SidebarNavButton } from "@/components/layout/sidebar-nav-button";
import { useConnectionDrag } from "@/hooks/use-connection-drag";
import { Plus, Database, Terminal, Activity, Radio, Download, ChevronLeft } from "lucide-react";
import { listConnections } from "@/lib/tauri-api";

/** 左侧边栏组件 — 连接列表 */
export function Sidebar() {
  const { t } = useTranslation();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();
  const { connections, setConnections, openDialog } = useConnectionStore();
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const { getDragProps, handleContainerDragOver, handleContainerDrop, handleTopDragOver, handleTopDrop } = useConnectionDrag();

  /** 初始化加载连接列表 */
  useEffect(() => {
    listConnections().then(setConnections).catch(console.error);
  }, [setConnections]);

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
          onClick={() => useAppStore.getState().activateTab("browser")}
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
      <div className="p-2" onDragOver={handleTopDragOver} onDrop={handleTopDrop}>
        <Button className="w-full" size="sm" onClick={() => openDialog()}>
          <Plus size={14} />
          {t("connection.new")}
        </Button>
      </div>

      {/* 连接列表 */}
      <div className="flex-1 overflow-y-auto px-2 pb-2" onDragOver={handleContainerDragOver} onDrop={handleContainerDrop}>
        {connections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs text-center px-4">
            <Database size={16} />
            <p className="mt-2">{t("connection.noConnections")}</p>
            <p className="mt-1 opacity-60">{t("connection.noConnectionsDesc")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {connections.map((conn) => (
              <ConnectionItem key={conn.id} connection={conn} dragProps={getDragProps(conn.id)} />
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

