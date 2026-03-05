"use client";

import { useTranslation } from "react-i18next";

/** 状态栏组件 */
export function StatusBar() {
  const { t } = useTranslation();

  return (
    <footer className="flex items-center justify-end h-6 px-3 border-t border-border bg-card text-xs text-muted-foreground shrink-0">
      <span>{t("connection.disconnect")}</span>
    </footer>
  );
}
