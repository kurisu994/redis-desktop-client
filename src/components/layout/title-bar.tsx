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

/** 顶部标题栏组件 */
export function TitleBar() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <header className="flex items-center justify-between h-12 px-4 border-b bg-card shrink-0">
      {/* 左侧 Logo */}
      <div className="flex items-center gap-2">
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
          <TooltipContent>{theme === "dark" ? t("theme.light") : t("theme.dark")}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon">
              <Settings size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("actions.settings")}</TooltipContent>
        </Tooltip>
      </div>
    </header>
  );
}
