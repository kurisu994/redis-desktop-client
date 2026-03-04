"use client";

import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button, Input, Select, SelectItem } from "@heroui/react";
import { useBrowserStore } from "@/stores/browser-store";
import { Search, RefreshCw, Plus, List, FolderTree } from "lucide-react";
import { KeyDialog } from "./key-dialog";

interface KeyToolbarProps {
  onRefresh: () => void;
  onSearch: () => void;
}

/** 工具栏 — db 选择器 + 刷新 + 搜索 + 视图切换 + 新建 Key */
export function KeyToolbar({ onRefresh, onSearch }: KeyToolbarProps) {
  const { t } = useTranslation();
  const {
    selectedDb,
    setSelectedDb,
    dbList,
    dbCount,
    viewMode,
    setViewMode,
    filterPattern,
    setFilterPattern,
    loading,
    resetBrowser,
  } = useBrowserStore();
  const [showNewKey, setShowNewKey] = useState(false);

  /** 切换数据库 */
  const handleDbChange = (keys: Set<string> | string) => {
    const val = typeof keys === "string" ? keys : Array.from(keys)[0];
    if (val !== undefined) {
      const db = parseInt(val, 10);
      setSelectedDb(db);
      resetBrowser();
    }
  };

  /** 搜索提交 */
  const handleSearchSubmit = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  // 构建 db 选项列表
  const dbOptions = Array.from({ length: dbCount }, (_, i) => {
    const info = dbList.find((d) => d.db === i);
    return {
      value: String(i),
      label: `db${i}`,
      count: info?.size ?? 0,
    };
  });

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-divider dark:bg-[#151619]/50">
        {/* 数据库选择器 */}
        <Select
          size="sm"
          className="w-32"
          selectedKeys={new Set([String(selectedDb)])}
          onSelectionChange={(keys) => handleDbChange(keys as Set<string>)}
          aria-label={t("connection.database")}
        >
          {dbOptions.map((opt) => (
            <SelectItem key={opt.value} textValue={opt.label}>
              <div className="flex justify-between items-center w-full">
                <span>{opt.label}</span>
                {opt.count > 0 && (
                  <span className="text-default-400 text-xs">{opt.count}</span>
                )}
              </div>
            </SelectItem>
          ))}
        </Select>

        {/* 刷新按钮 */}
        <Button
          isIconOnly
          size="sm"
          variant="bordered"
          onPress={onRefresh}
          isLoading={loading}
          aria-label={t("actions.refresh")}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>

        {/* 搜索框 */}
        <Input
          size="sm"
          className="flex-1 max-w-md"
          placeholder={t("browser.filterKeys")}
          value={filterPattern}
          onValueChange={setFilterPattern}
          onKeyDown={handleSearchSubmit}
          startContent={<Search className="w-4 h-4 text-default-400" />}
          isClearable
          onClear={() => {
            setFilterPattern("");
            onSearch();
          }}
        />

        <div className="flex-1" />

        {/* 视图切换 */}
        <div className="flex border border-divider rounded-lg overflow-hidden">
          <button
            className={`p-1.5 transition-colors ${
              viewMode === "tree"
                ? "bg-primary-100 text-primary dark:bg-primary-900/30"
                : "hover:bg-default-100 text-default-500"
            }`}
            onClick={() => setViewMode("tree")}
            title={t("browser.treeView")}
          >
            <FolderTree className="w-4 h-4" />
          </button>
          <button
            className={`p-1.5 transition-colors ${
              viewMode === "flat"
                ? "bg-primary-100 text-primary dark:bg-primary-900/30"
                : "hover:bg-default-100 text-default-500"
            }`}
            onClick={() => setViewMode("flat")}
            title={t("browser.flatView")}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* 新建 Key */}
        <Button
          size="sm"
          color="primary"
          startContent={<Plus className="w-4 h-4" />}
          onPress={() => setShowNewKey(true)}
        >
          {t("browser.newKey")}
        </Button>
      </div>

      {/* 新建 Key 对话框 */}
      {showNewKey && (
        <KeyDialog
          isOpen={showNewKey}
          onClose={() => setShowNewKey(false)}
          onCreated={() => {
            setShowNewKey(false);
            onRefresh();
          }}
        />
      )}
    </>
  );
}
