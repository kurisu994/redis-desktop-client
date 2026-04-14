"use client";

import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Sun, Moon, Settings } from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";
import { useAppStore } from "@/stores/app-store";

const GITHUB_URL = "https://github.com/kurisu994/redis-desktop-client";

/** GitHub 图标（来自 Simple Icons，替代已废弃的 lucide Github） */
function GitHubIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/** 打开外部链接（Tauri 环境用 opener 插件，浏览器环境用 window.open） */
async function openExternal(url: string) {
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } catch {
    window.open(url, "_blank");
  }
}

/** 顶部标题栏组件 */
export function TitleBar() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const { openTab } = useAppStore();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="flex items-center justify-between h-12 px-4 border-b bg-card shrink-0">
      {/* 左侧 Logo */}
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- Tauri 静态导出不支持 next/image */}
        <img src="/logo.png" alt="R" className="w-6 h-6 object-contain" />
        <span className="text-sm font-semibold">{t("app.title")}</span>
      </div>

      {/* 右侧操作按钮 */}
      <div className="flex items-center gap-1">
        <LanguageSwitcher />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {theme === "dark" ? t("theme.light") : t("theme.dark")}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openTab("settings")}
            >
              <Settings size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("actions.settings")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openExternal(GITHUB_URL)}
            >
              <GitHubIcon size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>GitHub</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
