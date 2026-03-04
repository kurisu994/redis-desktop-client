"use client";

import { TitleBar } from "@/components/layout/title-bar";
import { Sidebar } from "@/components/layout/sidebar";
import { StatusBar } from "@/components/layout/status-bar";
import { WelcomePage } from "@/components/layout/welcome-page";

/** 应用主页 — 三栏布局 */
export default function Home() {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <WelcomePage />
        </main>
      </div>
      <StatusBar />
    </div>
  );
}
