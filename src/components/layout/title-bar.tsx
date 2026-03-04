"use client";

import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Button, Tooltip } from "@heroui/react";
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
    <header className="flex items-center justify-between h-12 px-4 border-b border-divider bg-content1 shrink-0">
      {/* 左侧 Logo */}
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="R" className="w-6 h-6 object-contain" />
        <span className="text-sm font-semibold">{t("app.title")}</span>
      </div>

      {/* 右侧操作按钮 */}
      <div className="flex items-center gap-1">
        <LanguageSwitcher />
        <Tooltip content={theme === "dark" ? t("theme.light") : t("theme.dark")}>
          <Button isIconOnly variant="light" size="sm" onPress={toggleTheme}>
            {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
        </Tooltip>
        <Tooltip content={t("actions.settings")}>
          <Button isIconOnly variant="light" size="sm">
            <Settings size={20} />
          </Button>
        </Tooltip>
      </div>
    </header>
  );
}
