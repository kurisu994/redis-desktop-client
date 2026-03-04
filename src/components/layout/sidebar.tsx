"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@heroui/react";
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

      {/* 新建连接按钮 */}
      <div className="p-2">
        <Button
          color="primary"
          className="w-full"
          size="sm"
          startContent={<PlusIcon />}
        >
          {t("connection.new")}
        </Button>
      </div>

      {/* 连接列表（Phase 2 实现具体内容） */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col items-center justify-center h-full text-default-400 text-xs text-center px-4">
          <DatabaseIcon />
          <p className="mt-2">{t("connection.noConnections")}</p>
          <p className="mt-1 text-default-300">{t("connection.noConnectionsDesc")}</p>
        </div>
      </div>

      {/* 底部导航 — CLI / Monitor / Pub/Sub */}
      <div className="border-t border-divider shrink-0">
        <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-default-500 hover:bg-default-100 transition-colors">
          <TerminalIcon />
          <span>{t("cli.title")}</span>
        </button>
        <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-default-500 hover:bg-default-100 transition-colors">
          <ActivityIcon />
          <span>{t("monitor.title")}</span>
        </button>
        <button className="flex items-center gap-2 w-full px-3 py-2 text-xs text-default-500 hover:bg-default-100 transition-colors">
          <RadioIcon />
          <span>{t("pubsub.title")}</span>
        </button>
      </div>
    </aside>
  );
}
