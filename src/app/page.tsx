"use client";

import { TitleBar } from "@/components/layout/title-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { StatusBar } from "@/components/layout/status-bar";
import { WelcomePage } from "@/components/layout/welcome-page";
import { ConnectionDialog } from "@/components/connection/connection-dialog";
import { DataBrowser } from "@/components/browser/data-browser";
import { useConnectionStore } from "@/stores/connection-store";

/** 应用主页 — 三栏布局 */
export default function Home() {
  const { activeConnectionId, connectionStatus } = useConnectionStore();

  // 判断当前是否有已连接的连接
  const isConnected =
    activeConnectionId !== null &&
    connectionStatus[activeConnectionId] === "connected";

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden">
          {isConnected ? <DataBrowser /> : <WelcomePage />}
        </main>
      </div>
      <StatusBar />
      <ConnectionDialog />
    </div>
  );
}
