"use client";

import type { KeyEntry } from "@/stores/browser-store";
import { Virtuoso } from "react-virtuoso";

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

interface KeyListProps {
  keys: KeyEntry[];
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
}

/** 平铺 Key 列表 — 虚拟滚动 */
export function KeyList({ keys, selectedKey, onSelectKey }: KeyListProps) {
  return (
    <Virtuoso
      data={keys}
      itemContent={(_, entry) => {
        const isSelected = selectedKey === entry.key;
        return (
          <button
            className={`flex items-center gap-2 w-full py-1.5 px-3 text-sm transition-colors ${
              isSelected
                ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                : "hover:bg-default-100"
            }`}
            onClick={() => onSelectKey(entry.key)}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                TYPE_COLORS[entry.key_type] || "bg-default-400"
              }`}
            />
            <span className="truncate font-mono text-xs flex-1 text-left">
              {entry.key}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 uppercase font-medium ${
                TYPE_LABEL_COLORS[entry.key_type] || "text-default-400 bg-default-100"
              }`}
            >
              {entry.key_type}
            </span>
          </button>
        );
      }}
    />
  );
}
