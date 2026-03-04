"use client";

import { useTranslation } from "react-i18next";
import { useAppStore } from "@/stores/app-store";

function DatabaseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
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

/** 左侧边栏组件 — 连接列表 */
export function Sidebar() {
  const { t } = useTranslation();
  const { sidebarCollapsed, toggleSidebar } = useAppStore();

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
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <DatabaseIcon />
          <span>{t("connection.title")}</span>
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1 rounded-md hover:bg-default-100 transition-colors"
        >
          <ChevronIcon collapsed={false} />
        </button>
      </div>

      {/* 连接列表（Phase 2 实现具体内容） */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col items-center justify-center h-full text-default-400 text-xs text-center px-4">
          <DatabaseIcon />
          <p className="mt-2">{t("connection.noConnections")}</p>
          <p className="mt-1 text-default-300">{t("connection.noConnectionsDesc")}</p>
        </div>
      </div>
    </aside>
  );
}
