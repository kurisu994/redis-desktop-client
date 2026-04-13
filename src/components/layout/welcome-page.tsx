"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useConnectionStore } from "@/stores/connection-store";
import { Plus } from "lucide-react";

/** 闪电图标 — 匹配设计图的紫色渐变风格 */
function ZapIcon() {
  return (
    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary"
      >
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    </div>
  );
}

/** 空状态欢迎页 — 无连接时展示 */
export function WelcomePage() {
  const { t } = useTranslation();
  const openDialog = useConnectionStore((s) => s.openDialog);

  return (
    <div className="flex flex-col items-center justify-center flex-1 h-full text-center">
      <ZapIcon />
      <h1 className="text-2xl font-bold mt-6">{t("app.welcome")}</h1>
      <p className="text-muted-foreground mt-2 max-w-md">
        {t("app.welcomeDesc")}
      </p>
      <Button size="lg" className="mt-6" onClick={() => openDialog()}>
        <Plus size={18} />
        {t("connection.new")}
      </Button>
    </div>
  );
}
