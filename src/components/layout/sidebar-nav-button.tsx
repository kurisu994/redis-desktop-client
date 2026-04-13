"use client";

import { useAppStore } from "@/stores/app-store";
import { useConnectionStore } from "@/stores/connection-store";

/** 侧边栏底部导航按钮 — 打开或激活对应 Tab */
export function SidebarNavButton({
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
  const isConnected =
    activeConnectionId !== null &&
    connectionStatus[activeConnectionId] === "connected";
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
