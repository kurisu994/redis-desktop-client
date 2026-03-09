"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useMemo } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useAppStore } from "@/stores/app-store";
import type { TabType } from "@/stores/app-store";
import { useConnectionStore } from "@/stores/connection-store";
import { useBrowserStore } from "@/stores/browser-store";
import {
  Plus,
  Terminal,
  Search,
  RefreshCw,
  Trash2,
  Save,
  Settings,
  Activity,
  Radio,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeft,
  Keyboard,
} from "lucide-react";
import { useTheme } from "next-themes";

/** 命令项定义 */
interface CommandEntry {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  /** 是否需要已连接的 Redis */
  requiresConnection?: boolean;
}

/** 常用命令面板 — ⌘K 打开，预置常用命令快捷入口 */
export function CommandPalette() {
  const { t } = useTranslation();
  const { commandPaletteOpen, setCommandPaletteOpen, openTab, sidebarCollapsed, toggleSidebar } = useAppStore();
  const { openDialog } = useConnectionStore();
  const { refreshKeys, selectedKey } = useBrowserStore();
  const { theme, setTheme } = useTheme();

  const close = useCallback(() => setCommandPaletteOpen(false), [setCommandPaletteOpen]);

  /** 执行命令并关闭面板 */
  const run = useCallback(
    (action: () => void) => {
      close();
      // 延迟执行，确保对话框关闭后再触发操作
      setTimeout(action, 50);
    },
    [close],
  );

  /** 连接相关命令 */
  const connectionCommands: CommandEntry[] = useMemo(
    () => [
      {
        id: "new-connection",
        label: t("commandPalette.newConnection"),
        icon: <Plus className="w-4 h-4" />,
        shortcut: "⌘N",
        action: () => run(() => openDialog()),
      },
    ],
    [t, run, openDialog],
  );

  /** 浏览器操作命令 */
  const browserCommands: CommandEntry[] = useMemo(
    () => [
      {
        id: "search-keys",
        label: t("commandPalette.searchKeys"),
        icon: <Search className="w-4 h-4" />,
        shortcut: "⌘F",
        requiresConnection: true,
        action: () =>
          run(() => {
            useAppStore.getState().activateTab("browser");
            setTimeout(() => {
              const input = document.querySelector<HTMLInputElement>('[data-search-input="true"]');
              input?.focus();
            }, 100);
          }),
      },
      {
        id: "refresh-keys",
        label: t("commandPalette.refreshKeys"),
        icon: <RefreshCw className="w-4 h-4" />,
        shortcut: "F5",
        requiresConnection: true,
        action: () => run(() => refreshKeys()),
      },
      {
        id: "delete-key",
        label: t("commandPalette.deleteKey"),
        icon: <Trash2 className="w-4 h-4" />,
        shortcut: "⌘D",
        requiresConnection: true,
        action: () =>
          run(() => {
            if (selectedKey) {
              window.dispatchEvent(new CustomEvent("redis:delete-key"));
            }
          }),
      },
      {
        id: "save-edit",
        label: t("commandPalette.saveEdit"),
        icon: <Save className="w-4 h-4" />,
        shortcut: "⌘S",
        requiresConnection: true,
        action: () => run(() => window.dispatchEvent(new CustomEvent("redis:save"))),
      },
    ],
    [t, run, refreshKeys, selectedKey],
  );

  /** 导航命令 */
  const navigationCommands: CommandEntry[] = useMemo(
    () => [
      {
        id: "open-cli",
        label: t("commandPalette.openCli"),
        icon: <Terminal className="w-4 h-4" />,
        shortcut: "⌘T",
        requiresConnection: true,
        action: () => run(() => openTab("cli")),
      },
      {
        id: "open-monitor",
        label: t("commandPalette.openMonitor"),
        icon: <Activity className="w-4 h-4" />,
        requiresConnection: true,
        action: () => run(() => openTab("monitor")),
      },
      {
        id: "open-pubsub",
        label: t("commandPalette.openPubsub"),
        icon: <Radio className="w-4 h-4" />,
        requiresConnection: true,
        action: () => run(() => openTab("pubsub")),
      },
      {
        id: "open-settings",
        label: t("commandPalette.openSettings"),
        icon: <Settings className="w-4 h-4" />,
        shortcut: "⌘,",
        action: () => run(() => openTab("settings")),
      },
    ],
    [t, run, openTab],
  );

  /** 通用命令 */
  const generalCommands: CommandEntry[] = useMemo(
    () => [
      {
        id: "toggle-theme",
        label: theme === "dark" ? t("commandPalette.lightTheme") : t("commandPalette.darkTheme"),
        icon: theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
        action: () => run(() => setTheme(theme === "dark" ? "light" : "dark")),
      },
      {
        id: "toggle-sidebar",
        label: sidebarCollapsed ? t("commandPalette.showSidebar") : t("commandPalette.hideSidebar"),
        icon: sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />,
        action: () => run(() => toggleSidebar()),
      },
      {
        id: "show-shortcuts",
        label: t("commandPalette.showShortcuts"),
        icon: <Keyboard className="w-4 h-4" />,
        action: () => run(() => openTab("settings" as TabType)),
      },
    ],
    [t, run, theme, setTheme, sidebarCollapsed, toggleSidebar, openTab],
  );

  /** 选择命令时触发 */
  const handleSelect = useCallback(
    (commandId: string) => {
      const allCommands = [...connectionCommands, ...browserCommands, ...navigationCommands, ...generalCommands];
      const cmd = allCommands.find((c) => c.id === commandId);
      cmd?.action();
    },
    [connectionCommands, browserCommands, navigationCommands, generalCommands],
  );

  return (
    <CommandDialog
      open={commandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
      title={t("commandPalette.title")}
      description={t("commandPalette.description")}
      showCloseButton={false}
    >
      <CommandInput placeholder={t("commandPalette.placeholder")} />
      <CommandList>
        <CommandEmpty>{t("commandPalette.noResults")}</CommandEmpty>

        <CommandGroup heading={t("commandPalette.groupConnection")}>
          {connectionCommands.map((cmd) => (
            <CommandItem key={cmd.id} value={cmd.id} onSelect={handleSelect} keywords={[cmd.label]}>
              {cmd.icon}
              <span>{cmd.label}</span>
              {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading={t("commandPalette.groupBrowser")}>
          {browserCommands.map((cmd) => (
            <CommandItem key={cmd.id} value={cmd.id} onSelect={handleSelect} keywords={[cmd.label]}>
              {cmd.icon}
              <span>{cmd.label}</span>
              {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading={t("commandPalette.groupNavigation")}>
          {navigationCommands.map((cmd) => (
            <CommandItem key={cmd.id} value={cmd.id} onSelect={handleSelect} keywords={[cmd.label]}>
              {cmd.icon}
              <span>{cmd.label}</span>
              {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading={t("commandPalette.groupGeneral")}>
          {generalCommands.map((cmd) => (
            <CommandItem key={cmd.id} value={cmd.id} onSelect={handleSelect} keywords={[cmd.label]}>
              {cmd.icon}
              <span>{cmd.label}</span>
              {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
