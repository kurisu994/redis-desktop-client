"use client";

import type { KeyEntry } from "@/stores/browser-store";
import { useBrowserStore } from "@/stores/browser-store";
import { Virtuoso } from "react-virtuoso";
import { Star, Loader2 } from "lucide-react";

/** Key 类型对应的颜色 */
const TYPE_COLORS: Record<string, string> = {
  string: "bg-green-500",
  hash: "bg-blue-500",
  list: "bg-orange-500",
  set: "bg-purple-500",
  zset: "bg-red-500",
  stream: "bg-cyan-500",
};

/** Key 类型标签颜色 */
const TYPE_LABEL_COLORS: Record<string, string> = {
  string: "text-green-400 bg-green-500/10",
  hash: "text-blue-400 bg-blue-500/10",
  list: "text-orange-400 bg-orange-500/10",
  set: "text-purple-400 bg-purple-500/10",
  zset: "text-red-400 bg-red-500/10",
  stream: "text-cyan-400 bg-cyan-500/10",
};

/** 选中态圆点发光效果 */
const TYPE_GLOW: Record<string, string> = {
  string: "shadow-[0_0_8px_rgba(34,197,94,0.5)]",
  hash: "shadow-[0_0_8px_rgba(59,130,246,0.5)]",
  list: "shadow-[0_0_8px_rgba(249,115,22,0.5)]",
  set: "shadow-[0_0_8px_rgba(168,85,247,0.5)]",
  zset: "shadow-[0_0_8px_rgba(239,68,68,0.5)]",
  stream: "shadow-[0_0_8px_rgba(6,182,212,0.5)]",
};

interface KeyListProps {
  keys: KeyEntry[];
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  loading?: boolean;
}

/** 平铺 Key 列表 — 虚拟滚动，支持多选和收藏 */
export function KeyList({ keys, selectedKey, onSelectKey, loading }: KeyListProps) {
  const { checkedKeys, toggleCheckedKey, favorites, toggleFavorite } = useBrowserStore();

  return (
    <div className="relative h-full">
      <Virtuoso
        data={keys}
        itemContent={(_, entry) => {
          const isSelected = selectedKey === entry.key;
          const isChecked = checkedKeys.has(entry.key);
          const isFavorite = favorites.has(entry.key);
          return (
            <div
              className={`flex items-center gap-1 w-full py-1.5 px-1.5 text-sm transition-colors group ${
                isSelected
                  ? "bg-primary/15 text-primary"
                : "hover:bg-white/5 text-foreground/70"
            }`}
          >
            {/* 多选 Checkbox */}
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                e.stopPropagation();
                toggleCheckedKey(entry.key);
              }}
              className="w-3.5 h-3.5 shrink-0 accent-primary cursor-pointer"
            />
            {/* 可点击区域 */}
            <button
              className="flex items-center gap-2 flex-1 min-w-0"
              onClick={() => onSelectKey(entry.key)}
            >
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  TYPE_COLORS[entry.key_type] || "bg-muted-foreground"
                } ${isSelected ? TYPE_GLOW[entry.key_type] || "" : ""}`}
              />
              <span className="truncate font-mono text-xs flex-1 text-left">
                {entry.key}
              </span>
            </button>
            {/* 收藏按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(entry.key);
              }}
              className={`shrink-0 p-0.5 transition-opacity ${
                isFavorite
                  ? "text-yellow-500 opacity-100"
                  : "text-muted-foreground opacity-0 group-hover:opacity-60 hover:!opacity-100"
              }`}
            >
              <Star className={`w-3 h-3 ${isFavorite ? "fill-yellow-500" : ""}`} />
            </button>
            {/* 类型标签 */}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 uppercase font-medium ${
                TYPE_LABEL_COLORS[entry.key_type] || "text-muted-foreground bg-accent"
              }`}
            >
              {entry.key_type}
            </span>
          </div>
        );
      }}
      />
      {loading && keys.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
}
