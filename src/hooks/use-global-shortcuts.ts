"use client";

import { useEffect } from "react";
import { useAppStore } from "@/stores/app-store";
import { useConnectionStore } from "@/stores/connection-store";
import { useBrowserStore } from "@/stores/browser-store";

/**
 * 判断当前焦点是否在可编辑元素中
 * 用于避免在输入框内触发全局快捷键
 */
function isEditableElement(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  // Monaco Editor 的 textarea
  if (el.closest(".monaco-editor")) return true;
  return false;
}

/**
 * 全局快捷键钩子
 * 监听常用快捷键并触发对应操作
 */
export function useGlobalShortcuts() {
  const { openTab, activateTab, setCommandPaletteOpen } = useAppStore();
  const { openDialog } = useConnectionStore();
  const { refreshKeys, selectedKey } = useBrowserStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;

      // F5: 刷新键列表（无需修饰键）
      if (e.key === "F5") {
        e.preventDefault();
        refreshKeys();
        return;
      }

      // Delete / Backspace（无修饰键）：删除选中 Key — 仅在非编辑元素中触发
      if ((e.key === "Delete" || e.key === "Backspace") && !isMod && !e.shiftKey && !e.altKey) {
        if (!isEditableElement(e.target) && selectedKey) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("redis:delete-key"));
          return;
        }
      }

      if (!isMod) return;

      switch (e.key) {
        case "n":
        case "N":
          // ⌘N: 新建连接
          e.preventDefault();
          openDialog();
          break;
        case "t":
        case "T":
          // ⌘T: 打开/激活 CLI Tab
          e.preventDefault();
          openTab("cli");
          break;
        case "f":
        case "F":
          // ⌘F: 聚焦搜索框（切到 browser Tab）
          if (!e.shiftKey) {
            e.preventDefault();
            activateTab("browser");
            setTimeout(() => {
              const input = document.querySelector<HTMLInputElement>('[data-search-input="true"]');
              input?.focus();
            }, 100);
          }
          break;
        case "r":
        case "R":
          // ⌘R: 刷新键列表
          if (!e.shiftKey) {
            e.preventDefault();
            refreshKeys();
          }
          break;
        case "k":
        case "K":
          // ⌘K: 打开命令面板
          if (!e.shiftKey) {
            e.preventDefault();
            setCommandPaletteOpen(true);
          }
          break;
        case "d":
        case "D":
          // ⌘D: 删除选中 Key
          if (!e.shiftKey && selectedKey) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("redis:delete-key"));
          }
          break;
        case "s":
        case "S":
          // ⌘S: 保存当前编辑
          if (!e.shiftKey) {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("redis:save"));
          }
          break;
        case ",":
          // ⌘,: 打开/激活设置 Tab
          e.preventDefault();
          openTab("settings");
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openTab, activateTab, openDialog, refreshKeys, setCommandPaletteOpen, selectedKey]);
}
