"use client";

import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { KeyInfo } from "@/stores/browser-store";
import { useBrowserStore } from "@/stores/browser-store";
import { deleteKeys, setKeyTtl, copyKey, renameKey } from "@/lib/tauri-api";
import { Clock, Trash2, MoreVertical, Copy, Pencil, Star } from "lucide-react";
import { TtlDialog } from "./ttl-dialog";

/** 类型标签配色 */
const TYPE_BADGE: Record<string, string> = {
  string: "text-green-400 bg-green-500/10",
  hash: "text-blue-400 bg-blue-500/10",
  list: "text-orange-400 bg-orange-500/10",
  set: "text-purple-400 bg-purple-500/10",
  zset: "text-red-400 bg-red-500/10",
  stream: "text-cyan-400 bg-cyan-500/10",
};

const TYPE_DOT: Record<string, string> = {
  string: "bg-green-500",
  hash: "bg-blue-500",
  list: "bg-orange-500",
  set: "bg-purple-500",
  zset: "bg-red-500",
  stream: "bg-cyan-500",
};

interface KeyDetailProps {
  keyName: string;
  keyInfo: KeyInfo;
  onDeleted: () => void;
  onRefresh: () => void;
}

/** Key 详情头部 — Key 名 + 类型标签 + TTL + 操作按钮 */
export function KeyDetail({ keyName, keyInfo, onDeleted, onRefresh }: KeyDetailProps) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const favorites = useBrowserStore((s) => s.favorites);
  const toggleFavorite = useBrowserStore((s) => s.toggleFavorite);
  const isFavorite = favorites.has(keyName);
  const [showTtl, setShowTtl] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");

  /** 删除 Key */
  const handleDelete = async () => {
    if (!connectionId) return;
    if (!confirm(t("keyDetail.deleteConfirm", { key: keyName }))) return;
    await deleteKeys(connectionId, selectedDb, [keyName]);
    onDeleted();
  };

  /** 复制 Key */
  const handleCopy = async () => {
    if (!connectionId) return;
    const dst = prompt(t("keyDetail.destinationKey"), `${keyName}:copy`);
    if (!dst) return;
    await copyKey(connectionId, selectedDb, keyName, dst);
    onRefresh();
  };

  /** 重命名 Key */
  const handleRename = async () => {
    if (!connectionId || !newName.trim()) return;
    await renameKey(connectionId, selectedDb, keyName, newName.trim());
    setRenaming(false);
    onDeleted(); // 触发重新加载
  };

  /** 格式化字节大小 */
  const formatSize = (bytes: number) => {
    if (bytes < 0) return "N/A";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="p-5 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Key 名称 */}
            {renaming ? (
              <div className="flex items-center gap-2">
                <input
                  className="text-xl font-mono bg-transparent border-b border-primary outline-none flex-1"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRename()}
                  autoFocus
                />
                <Button size="sm" onClick={handleRename}>
                  {t("actions.confirm")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setRenaming(false)}
                >
                  {t("actions.cancel")}
                </Button>
              </div>
            ) : (
              <h2 className="text-xl font-mono font-medium break-all tracking-tight">
                {keyName}
              </h2>
            )}

            {/* 元信息标签 */}
            <div className="flex items-center gap-5 mt-3 text-sm font-mono flex-wrap">
              {/* 类型 */}
              <span
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${
                  TYPE_BADGE[keyInfo.key_type] || "text-muted-foreground bg-muted"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    TYPE_DOT[keyInfo.key_type] || "bg-muted-foreground"
                  }`}
                />
                {keyInfo.key_type.toUpperCase()}
              </span>

              {/* TTL */}
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {keyInfo.ttl < 0
                  ? t("keyDetail.ttlNone")
                  : t("keyDetail.ttlSeconds", { seconds: keyInfo.ttl })}
              </span>

              {/* 大小 */}
              <span className="text-muted-foreground">
                {t("keyDetail.size")}: {formatSize(keyInfo.size)}
              </span>

              {/* 长度 */}
              <span className="text-muted-foreground">
                {t("keyDetail.length")}: {keyInfo.length}
              </span>

              {/* 编码 */}
              <span className="text-muted-foreground">
                {t("keyDetail.encoding")}: {keyInfo.encoding}
              </span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => toggleFavorite(keyName)}
              title={isFavorite ? t("keyDetail.removeFavorite") : t("keyDetail.addFavorite")}
              className="h-8 w-8"
            >
              <Star className={`w-4 h-4 ${isFavorite ? "fill-yellow-500 text-yellow-500" : ""}`} />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTtl(true)}
            >
              <Clock className="w-3.5 h-3.5" />
              TTL
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("actions.delete")}
            </Button>
            <div className="relative">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setShowMore(!showMore)}
                className="h-8 w-8"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
              {showMore && (
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] bg-card border border-border rounded-lg shadow-lg py-1">
                  <button
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2"
                    onClick={() => {
                      setShowMore(false);
                      setNewName(keyName);
                      setRenaming(true);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    {t("keyDetail.renameKey")}
                  </button>
                  <button
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent flex items-center gap-2"
                    onClick={() => {
                      setShowMore(false);
                      handleCopy();
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {t("keyDetail.copyKey")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TTL 对话框 */}
      {showTtl && (
        <TtlDialog
          isOpen={showTtl}
          currentTtl={keyInfo.ttl}
          onClose={() => setShowTtl(false)}
          onSave={async (ttl) => {
            if (connectionId) {
              await setKeyTtl(connectionId, selectedDb, keyName, ttl);
              onRefresh();
            }
            setShowTtl(false);
          }}
        />
      )}
    </>
  );
}
