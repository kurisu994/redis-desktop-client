"use client";

import { useTranslation } from "react-i18next";

/** 状态栏组件 */
export function StatusBar() {
  const { t } = useTranslation();

  return (
    <footer className="flex items-center justify-between h-6 px-3 border-t border-divider bg-content1 text-xs text-default-400 shrink-0">
      <span>Redis Desktop Client v0.1.0</span>
      <span>{t("connection.disconnect")}</span>
    </footer>
  );
}
