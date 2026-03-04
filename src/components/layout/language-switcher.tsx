"use client";

import { useTranslation } from "react-i18next";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
  Tooltip,
} from "@heroui/react";

function GlobeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

/** 语言切换器组件 */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <Dropdown>
      <Tooltip content={t("language.label")}>
        <div>
          <DropdownTrigger>
            <Button isIconOnly variant="light" size="sm">
              <GlobeIcon />
            </Button>
          </DropdownTrigger>
        </div>
      </Tooltip>
      <DropdownMenu
        aria-label="Language"
        selectionMode="single"
        selectedKeys={new Set([i18n.language])}
        onSelectionChange={(keys) => {
          const selected = Array.from(keys)[0] as string;
          if (selected) changeLanguage(selected);
        }}
      >
        <DropdownItem key="zh-CN">{t("language.zhCN")}</DropdownItem>
        <DropdownItem key="en-US">{t("language.enUS")}</DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
