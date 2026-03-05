"use client";

import { TitleBar } from "@/components/layout/title-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { TabBar } from "@/components/layout/tab-bar";
import { WelcomePage } from "@/components/layout/welcome-page";
import { ConnectionDialog } from "@/components/connection/connection-dialog";
import { DataBrowser } from "@/components/browser/data-browser";
import { CliConsole } from "@/components/cli/cli-console";
import { MonitorPage } from "@/components/monitor/monitor-page";
import { PubSubPage } from "@/components/pubsub/pubsub-page";
import { SettingsPage } from "@/components/layout/settings-page";
import { ErrorBoundary } from "@/components/error-boundary";
import { useConnectionStore } from "@/stores/connection-store";
import { useAppStore } from "@/stores/app-store";
import { useGlobalShortcuts } from "@/hooks/use-global-shortcuts";

/** 应用主页 — 三栏布局 */
export default function Home() {
  const { activeConnectionId, connectionStatus } = useConnectionStore();
  const { tabs, activeTabId } = useAppStore();

  // 注册全局快捷键
  useGlobalShortcuts();

  // 判断当前是否有已连接的连接
  const isConnected = activeConnectionId !== null && connectionStatus[activeConnectionId] === "connected";

  // 获取当前活跃 Tab 的类型
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const activeType = activeTab?.type ?? "browser";

  /** 根据活跃 Tab 类型和连接状态渲染主内容区 */
  const renderMainContent = () => {
    // 设置页面无需连接
    if (activeType === "settings") return <SettingsPage />;
    if (!isConnected) return <WelcomePage />;
    switch (activeType) {
      case "cli":
        return <CliConsole />;
      case "monitor":
        return <MonitorPage />;
      case "pubsub":
        return <PubSubPage />;
      default:
        return <DataBrowser />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TabBar />
          <main className="flex-1 flex overflow-hidden">
            <ErrorBoundary>{renderMainContent()}</ErrorBoundary>
          </main>
        </div>
      </div>
      <ConnectionDialog />
    </div>
  );
}
