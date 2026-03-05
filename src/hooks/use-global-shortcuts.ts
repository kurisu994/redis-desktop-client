"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useConnectionStore } from "@/stores/connection-store";
import { useBrowserStore } from "@/stores/browser-store";

/**
 * 全局快捷键钩子
 * 监听常用快捷键并触发对应操作
 */
export function useGlobalShortcuts() {
  const { setMainView } = useAppStore();
  const { openDialog } = useConnectionStore();
  const { refreshKeys } = useBrowserStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      switch (e.key) {
        case "n":
        case "N":
          // Cmd+N: 新建连接
          e.preventDefault();
          openDialog();
          break;
        case "t":
        case "T":
          // Cmd+T: 切换到 CLI 视图
          e.preventDefault();
          setMainView("cli");
          break;
        case "f":
        case "F":
          // Cmd+F: 聚焦搜索框
          if (!e.shiftKey) {
            e.preventDefault();
            setMainView("browser");
            setTimeout(() => {
              const input = document.querySelector<HTMLInputElement>(
                '[data-search-input="true"]'
              );
              input?.focus();
            }, 100);
          }
          break;
        case "r":
        case "R":
          // Cmd+R: 刷新键列表
          if (!e.shiftKey) {
            e.preventDefault();
            refreshKeys();
          }
          break;
        case ",":
          // Cmd+,: 打开设置
          e.preventDefault();
          setMainView("settings");
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setMainView, openDialog, refreshKeys]);
}
