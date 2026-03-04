"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@heroui/react";

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/** 闪电图标 — 匹配设计图的紫色渐变风格 */
function ZapIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

/** 空状态欢迎页 — 无连接时展示 */
export function WelcomePage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <ZapIcon />
      <h1 className="text-2xl font-bold mt-6">{t("app.welcome")}</h1>
      <p className="text-default-400 mt-2 max-w-md">
        {t("app.welcomeDesc")}
      </p>
      <Button
        color="primary"
        variant="shadow"
        size="lg"
        className="mt-6"
        startContent={<PlusIcon />}
      >
        {t("connection.new")}
      </Button>
    </div>
  );
}
