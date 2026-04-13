"use client";

import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useBrowserStore } from "@/stores/browser-store";
import {
  Search,
  RefreshCw,
  Plus,
  List,
  FolderTree,
  Download,
  Upload,
  X,
  Loader2,
  Star,
} from "lucide-react";
import { KeyDialog } from "./key-dialog";
import { ExportDialog } from "./export-dialog";
import { ImportDialog } from "./import-dialog";

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
    showFavoritesOnly,
    setShowFavoritesOnly,
  } = useBrowserStore();
  const [showNewKey, setShowNewKey] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  /** 切换数据库 */
  const handleDbChange = (val: string) => {
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
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border dark:bg-[#151619]/50">
        {/* 数据库选择器 */}
        <Select value={String(selectedDb)} onValueChange={handleDbChange}>
          <SelectTrigger
            className="w-32 h-8 text-sm"
            aria-label={t("connection.database")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {dbOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex justify-between items-center w-full">
                  <span>{opt.label}</span>
                  {opt.count > 0 && (
                    <span className="text-muted-foreground text-xs ml-2">
                      {opt.count}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 刷新按钮 */}
        <Button
          size="icon"
          variant="outline"
          onClick={onRefresh}
          disabled={loading}
          aria-label={t("actions.refresh")}
          className="h-8 w-8"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>

        {/* 搜索框 */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="h-8 text-sm pl-8 pr-8"
            placeholder={t("browser.filterKeys")}
            value={filterPattern}
            onChange={(e) => setFilterPattern(e.target.value)}
            onKeyDown={handleSearchSubmit}
            data-search-input="true"
          />
          {filterPattern && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setFilterPattern("");
                onSearch();
              }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex-1" />

        {/* 视图切换 */}
        <div className="flex border border-border rounded-lg overflow-hidden">
          <button
            className={`p-1.5 transition-colors ${
              viewMode === "tree"
                ? "bg-primary/10 text-primary dark:bg-primary/20"
                : "hover:bg-accent text-muted-foreground"
            }`}
            onClick={() => setViewMode("tree")}
            title={t("browser.treeView")}
          >
            <FolderTree className="w-4 h-4" />
          </button>
          <button
            className={`p-1.5 transition-colors ${
              viewMode === "flat"
                ? "bg-primary/10 text-primary dark:bg-primary/20"
                : "hover:bg-accent text-muted-foreground"
            }`}
            onClick={() => setViewMode("flat")}
            title={t("browser.flatView")}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* 收藏筛选 */}
        <button
          className={`p-1.5 rounded-lg border border-border transition-colors ${
            showFavoritesOnly
              ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/30"
              : "hover:bg-accent text-muted-foreground"
          }`}
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          title={
            showFavoritesOnly
              ? t("browser.showAll")
              : t("browser.showFavorites")
          }
        >
          <Star
            className={`w-4 h-4 ${showFavoritesOnly ? "fill-yellow-500" : ""}`}
          />
        </button>

        {/* 新建 Key */}
        <Button size="sm" onClick={() => setShowNewKey(true)}>
          <Plus className="w-4 h-4" />
          {t("browser.newKey")}
        </Button>

        {/* 导入导出 */}
        <Button
          size="icon"
          variant="outline"
          onClick={() => setShowExport(true)}
          aria-label={t("actions.export")}
          title={t("actions.export")}
          className="h-8 w-8"
        >
          <Download className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => setShowImport(true)}
          aria-label={t("actions.import")}
          title={t("actions.import")}
          className="h-8 w-8"
        >
          <Upload className="w-4 h-4" />
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

      {/* 导出对话框 */}
      <ExportDialog isOpen={showExport} onClose={() => setShowExport(false)} />

      {/* 导入对话框 */}
      <ImportDialog
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImportComplete={onRefresh}
      />
    </>
  );
}
