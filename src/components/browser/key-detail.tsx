"use client";

import { useTranslation } from "react-i18next";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { KeyInfo } from "@/stores/browser-store";
import { useBrowserStore } from "@/stores/browser-store";
import { deleteKeys, setKeyTtl, copyKey, renameKey } from "@/lib/tauri-api";
import { Clock, Trash2, MoreVertical, Copy, Pencil, Star } from "lucide-react";
import { TtlDialog } from "./ttl-dialog";
import { ConfirmDangerDialog } from "@/components/confirm-danger-dialog";

/** 类型标签配色 */
const TYPE_BADGE: Record<string, string> = {
  string: "text-green-400 bg-green-500/10",
  hash: "text-blue-400 bg-blue-500/10",
  list: "text-orange-400 bg-orange-500/10",
  set: "text-purple-400 bg-purple-500/10",
  zset: "text-red-400 bg-red-500/10",
  stream: "text-cyan-400 bg-cyan-500/10",
  rejson: "text-amber-400 bg-amber-500/10",
};

const TYPE_DOT: Record<string, string> = {
  string: "bg-green-500",
  hash: "bg-blue-500",
  list: "bg-orange-500",
  set: "bg-purple-500",
  zset: "bg-red-500",
  stream: "bg-cyan-500",
  rejson: "bg-amber-500",
};

interface KeyDetailProps {
  keyName: string;
  keyInfo: KeyInfo;
  onDeleted: () => void;
  onRefresh: () => void;
}

/** Key 详情头部 — Key 名 + 类型标签 + TTL + 操作按钮 */
export function KeyDetail({
  keyName,
  keyInfo,
  onDeleted,
  onRefresh,
}: KeyDetailProps) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const favorites = useBrowserStore((s) => s.favorites);
  const toggleFavorite = useBrowserStore((s) => s.toggleFavorite);
  const isFavorite = favorites.has(keyName);
  const [showTtl, setShowTtl] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /** 实时倒计时：基于 keyInfo.ttl 记录加载时刻，每秒递减 */
  const ttlLoadedAtRef = useRef(0);
  const [remainingTtl, setRemainingTtl] = useState(() => {
    if (keyInfo.ttl < 0) return -1;
    return keyInfo.ttl;
  });

  // keyInfo 变化时重置加载时刻
  useEffect(() => {
    ttlLoadedAtRef.current = Date.now();
  }, [keyInfo.ttl]);

  useEffect(() => {
    if (keyInfo.ttl < 0) return;
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - ttlLoadedAtRef.current) / 1000);
      const remaining = keyInfo.ttl - elapsed;
      if (remaining <= 0) {
        setRemainingTtl(0);
        clearInterval(timer);
        // TTL 到期，标记 key 已过期
        useBrowserStore.getState().setKeyInfo(null);
        useBrowserStore.getState().setKeyExpired(true);
        return;
      }
      setRemainingTtl(remaining);
    }, 1000);
    return () => clearInterval(timer);
  }, [keyInfo.ttl]);

  /** 格式化 TTL 为友好时间 */
  const formatTtl = useCallback((seconds: number) => {
    if (seconds < 0) return "TTL";
    if (seconds === 0) return "0s";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m${seconds % 60}s`;
    if (seconds < 86400) {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      return `${h}h${m}m`;
    }
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    return `${d}d${h}h`;
  }, []);

  /** 删除 Key */
  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  /** 确认删除 Key */
  const handleConfirmDelete = async () => {
    if (!connectionId) return;
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
                  TYPE_BADGE[keyInfo.key_type] ||
                  "text-muted-foreground bg-muted"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${TYPE_DOT[keyInfo.key_type] || "bg-muted-foreground"}`}
                />
                {keyInfo.key_type.toUpperCase()}
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
              title={
                isFavorite
                  ? t("keyDetail.removeFavorite")
                  : t("keyDetail.addFavorite")
              }
              className="h-8 w-8"
            >
              <Star
                className={`w-4 h-4 ${isFavorite ? "fill-yellow-500 text-yellow-500" : ""}`}
              />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTtl(true)}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className={remainingTtl >= 0 ? "text-amber-500 font-semibold" : ""}>
                {formatTtl(remainingTtl)}
              </span>
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

      {/* 删除确认对话框 */}
      <ConfirmDangerDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        title={t("keyDetail.deleteConfirmTitle")}
        message={
          <span className="text-sm text-muted-foreground">
            确定要删除键 <code className="bg-muted px-1 py-0.5 rounded text-primary font-mono text-xs">{keyName}</code> 吗？
          </span>
        }
      />
    </>
  );
}
