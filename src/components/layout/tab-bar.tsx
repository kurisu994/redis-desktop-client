"use client";

import { useTranslation } from "react-i18next";
import { useAppStore, Tab } from "@/stores/app-store";
import { Terminal, Activity, Radio, Settings, Database, X } from "lucide-react";

/** 根据 Tab 类型获取图标 */
function TabIcon({ type }: { type: Tab["type"] }) {
  const iconClass = "w-3.5 h-3.5";
  switch (type) {
    case "browser":
      return <Database className={iconClass} />;
    case "cli":
      return <Terminal className={iconClass} />;
    case "monitor":
      return <Activity className={iconClass} />;
    case "pubsub":
      return <Radio className={iconClass} />;
    case "settings":
      return <Settings className={iconClass} />;
  }
}

/** 根据 Tab 类型获取 i18n 标题 key */
function getTabTitleKey(type: Tab["type"]): string {
  switch (type) {
    case "browser":
      return "browser.title";
    case "cli":
      return "cli.title";
    case "monitor":
      return "monitor.title";
    case "pubsub":
      return "pubsub.title";
    case "settings":
      return "settings.title";
  }
}

/** Tab 栏组件 — 显示所有已打开的 Tab 页签 */
export function TabBar() {
  const { t } = useTranslation();
  const { tabs, activeTabId, activateTab, closeTab } = useAppStore();

  // 仅一个不可关闭的 Tab 时不显示 Tab 栏
  if (tabs.length <= 1 && !tabs[0]?.closable) return null;

  return (
    <div className="flex items-center border-b border-border bg-card shrink-0 overflow-x-auto">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <button
            key={tab.id}
            className={`group flex items-center gap-1.5 px-3 py-1.5 text-xs border-r border-border transition-colors whitespace-nowrap ${
              isActive
                ? "bg-background text-foreground border-b-2 border-b-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground border-b-2 border-b-transparent"
            }`}
            onClick={() => activateTab(tab.id)}
          >
            <TabIcon type={tab.type} />
            <span>{t(getTabTitleKey(tab.type))}</span>
            {tab.closable && (
              <span
                role="button"
                className="ml-1 p-0.5 rounded hover:bg-muted dark:hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <X className="w-3 h-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
