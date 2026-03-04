"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@heroui/react";

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function RedisLogo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-danger">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

/** 空状态欢迎页 — 无连接时展示 */
export function WelcomePage() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <RedisLogo />
      <h1 className="text-2xl font-bold mt-6">{t("app.welcome")}</h1>
      <p className="text-default-400 mt-2 max-w-md">
        {t("app.welcomeDesc")}
      </p>
      <Button
        color="primary"
        variant="shadow"
        className="mt-6"
        startContent={<PlusIcon />}
      >
        {t("connection.new")}
      </Button>
    </div>
  );
}
