"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useEffect } from "react";
import { useCliStore, type OutputEntry } from "@/stores/cli-store";
import { useConnectionStore } from "@/stores/connection-store";
import { useBrowserStore } from "@/stores/browser-store";
import { executeCommand } from "@/lib/tauri-api";
import { TerminalOutput } from "./terminal-output";
import { CommandInput } from "./command-input";
import { Terminal, Plus, X } from "lucide-react";

/** CLI 控制台主容器 — Tab 栏 + 终端区域 */
export function CliConsole() {
  const { t } = useTranslation();
  const { activeConnectionId, connections } = useConnectionStore();
  const { selectedDb } = useBrowserStore();
  const {
    tabs,
    activeTabId,
    addTab,
    removeTab,
    setActiveTab,
    addOutput,
    clearOutput,
    addHistory,
    setHistoryIndex,
  } = useCliStore();

  const activeTab = tabs.find((tab) => tab.id === activeTabId);
  const connectionName =
    connections.find((c) => c.id === activeConnectionId)?.name || "Redis";

  /** 如果没有 Tab 且有活跃连接，自动创建一个 */
  useEffect(() => {
    if (activeConnectionId && tabs.length === 0) {
      addTab(activeConnectionId, selectedDb, `${connectionName} CLI`);
    }
  }, [activeConnectionId, tabs.length, addTab, selectedDb, connectionName]);

  /** 新建 Tab */
  const handleNewTab = useCallback(() => {
    if (!activeConnectionId) return;
    addTab(activeConnectionId, selectedDb, `${connectionName} CLI`);
  }, [activeConnectionId, selectedDb, connectionName, addTab]);

  /** 关闭 Tab */
  const handleCloseTab = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      removeTab(tabId);
    },
    [removeTab],
  );

  /** 执行命令 */
  const handleExecute = useCallback(
    async (command: string) => {
      if (!activeTab || !activeConnectionId) return;

      // 特殊命令处理
      const upperCmd = command.trim().toUpperCase();

      // CLEAR / CLS 清屏
      if (upperCmd === "CLEAR" || upperCmd === "CLS") {
        clearOutput(activeTab.id);
        addHistory(activeTab.id, command);
        return;
      }

      // 记录输入
      const cmdEntry: OutputEntry = {
        type: "command",
        content: command,
        timestamp: Date.now(),
      };
      addOutput(activeTab.id, cmdEntry);
      addHistory(activeTab.id, command);

      try {
        const result = await executeCommand(
          activeConnectionId,
          activeTab.db,
          command,
        );
        const resultEntry: OutputEntry = {
          type: "result",
          content: result.output,
          resultType: result.result_type,
          elapsedMs: result.elapsed_ms,
          timestamp: Date.now(),
        };
        addOutput(activeTab.id, resultEntry);
      } catch (err) {
        const errorEntry: OutputEntry = {
          type: "error",
          content: String(err),
          timestamp: Date.now(),
        };
        addOutput(activeTab.id, errorEntry);
      }
    },
    [activeTab, activeConnectionId, addOutput, addHistory, clearOutput],
  );

  /** 处理 Ctrl+L 清屏 */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "l") {
        e.preventDefault();
        if (activeTab) {
          clearOutput(activeTab.id);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeTab, clearOutput]);

  if (!activeConnectionId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Terminal className="w-12 h-12 opacity-20" />
        <p className="text-sm">{t("cli.noConnection")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Tab 栏 */}
      <div className="flex items-center border-b border-border bg-card shrink-0 h-9">
        <div className="flex items-center flex-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`flex items-center gap-1.5 px-3 h-9 text-xs border-r border-border shrink-0 transition-colors ${
                tab.id === activeTabId
                  ? "bg-background text-foreground"
                  : "bg-card text-muted-foreground hover:bg-accent"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Terminal className="w-3 h-3" />
              <span className="max-w-[120px] truncate">{tab.title}</span>
              <span className="text-muted-foreground">db{tab.db}</span>
              <button
                className="ml-1 p-0.5 rounded hover:bg-muted transition-colors"
                onClick={(e) => handleCloseTab(e, tab.id)}
              >
                <X className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
        {/* 新建 Tab 按钮 */}
        <button
          className="px-2 h-9 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
          onClick={handleNewTab}
          title={t("cli.newTab")}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* 终端区域 */}
      {activeTab ? (
        <div
          className="flex-1 flex flex-col min-h-0 dark:bg-[#0E0E11] bg-white"
          data-cli-terminal
        >
          {/* 连接信息横幅 */}
          <div className="px-3 py-1.5 text-xs text-muted-foreground border-b border-border font-mono">
            {t("cli.connectedTo", { name: connectionName })} — db{activeTab.db}
            <span className="ml-2 text-muted-foreground/60">
              ({t("cli.helpHint")})
            </span>
          </div>

          {/* 输出区 */}
          <TerminalOutput outputs={activeTab.outputs} />

          {/* 输入区 */}
          <CommandInput
            history={activeTab.history}
            historyIndex={activeTab.historyIndex}
            onExecute={handleExecute}
            onHistoryIndexChange={(idx) => setHistoryIndex(activeTab.id, idx)}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Terminal className="w-12 h-12 opacity-20" />
          <p className="text-sm">{t("cli.noTab")}</p>
          <button
            className="text-primary text-sm hover:underline"
            onClick={handleNewTab}
          >
            {t("cli.newTab")}
          </button>
        </div>
      )}
    </div>
  );
}
