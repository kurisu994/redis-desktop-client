"use client";

import { TitleBar } from "@/components/layout/title-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { StatusBar } from "@/components/layout/status-bar";
import { WelcomePage } from "@/components/layout/welcome-page";
import { ConnectionDialog } from "@/components/connection/connection-dialog";
import { DataBrowser } from "@/components/browser/data-browser";
import { CliConsole } from "@/components/cli/cli-console";
import { MonitorPage } from "@/components/monitor/monitor-page";
import { PubSubPage } from "@/components/pubsub/pubsub-page";
import { useConnectionStore } from "@/stores/connection-store";
import { useAppStore } from "@/stores/app-store";

/** 应用主页 — 三栏布局 */
export default function Home() {
  const { activeConnectionId, connectionStatus } = useConnectionStore();
  const { mainView } = useAppStore();

  // 判断当前是否有已连接的连接
  const isConnected =
    activeConnectionId !== null &&
    connectionStatus[activeConnectionId] === "connected";

  /** 根据视图模式和连接状态渲染主内容区 */
  const renderMainContent = () => {
    if (!isConnected) return <WelcomePage />;
    switch (mainView) {
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
        <main className="flex-1 flex overflow-hidden">
          {renderMainContent()}
        </main>
      </div>
      <StatusBar />
      <ConnectionDialog />
    </div>
  );
}
