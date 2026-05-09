"use client";

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { KeyEntry } from "@/stores/browser-store";
import { useBrowserStore } from "@/stores/browser-store";
import { ChevronRight, ChevronDown, Folder, Star, Loader2 } from "lucide-react";

/** Key 类型对应的颜色 */
const TYPE_COLORS: Record<string, string> = {
  string: "bg-green-500",
  hash: "bg-blue-500",
  list: "bg-orange-500",
  set: "bg-purple-500",
  zset: "bg-red-500",
  stream: "bg-cyan-500",
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

/** 文件夹层级的弱色调，按深度轮换用于区分父级目录 */
const FOLDER_TONES = [
  {
    row: "bg-sky-500/[0.04] hover:bg-sky-500/[0.08]",
    icon: "text-sky-500/70 dark:text-sky-300/70",
    text: "text-sky-700/80 dark:text-sky-200/75",
    count: "text-sky-600/60 dark:text-sky-300/55",
    border: "border-sky-500/20",
  },
  {
    row: "bg-emerald-500/[0.04] hover:bg-emerald-500/[0.08]",
    icon: "text-emerald-500/70 dark:text-emerald-300/70",
    text: "text-emerald-700/80 dark:text-emerald-200/75",
    count: "text-emerald-600/60 dark:text-emerald-300/55",
    border: "border-emerald-500/20",
  },
  {
    row: "bg-violet-500/[0.04] hover:bg-violet-500/[0.08]",
    icon: "text-violet-500/70 dark:text-violet-300/70",
    text: "text-violet-700/80 dark:text-violet-200/75",
    count: "text-violet-600/60 dark:text-violet-300/55",
    border: "border-violet-500/20",
  },
  {
    row: "bg-amber-500/[0.04] hover:bg-amber-500/[0.08]",
    icon: "text-amber-500/70 dark:text-amber-300/70",
    text: "text-amber-700/80 dark:text-amber-200/75",
    count: "text-amber-600/60 dark:text-amber-300/55",
    border: "border-amber-500/20",
  },
] as const;

interface TreeNode {
  name: string;
  fullPath: string;
  children: Map<string, TreeNode>;
  keys: KeyEntry[];
}

interface KeyTreeProps {
  keys: KeyEntry[];
  selectedKey: string | null;
  onSelectKey: (key: string) => void;
  loading?: boolean;
}

export interface KeyTreeHandle {
  /** 展开父级目录并滚动到当前选中的 Key */
  locateSelectedKey: () => void;
}

/** 获取 Key 的所有父级目录路径 */
function getParentPaths(key: string) {
  const parts = key.split(":");
  return parts
    .slice(0, -1)
    .map((_, index) => parts.slice(0, index + 1).join(":"));
}

/** 根据目录深度获取弱色调 */
function getFolderTone(depth: number) {
  return FOLDER_TONES[depth % FOLDER_TONES.length];
}

/** 树形 Key 浏览器 — 按 : 分隔符构建命名空间层级，支持多选和收藏 */
export const KeyTree = forwardRef<KeyTreeHandle, KeyTreeProps>(function KeyTree(
  { keys, selectedKey, onSelectKey, loading },
  ref,
) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const leafRefs = useRef(new Map<string, HTMLDivElement>());
  const { checkedKeys, toggleCheckedKey, favorites, toggleFavorite } =
    useBrowserStore();

  /** 构建树结构 */
  const tree = useMemo(() => {
    const root: TreeNode = {
      name: "",
      fullPath: "",
      children: new Map(),
      keys: [],
    };

    for (const entry of keys) {
      const parts = entry.key.split(":");
      let current = root;

      if (parts.length === 1) {
        // 没有命名空间的 Key 放在根级
        root.keys.push(entry);
      } else {
        // 按命名空间逐级构建
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          const path = parts.slice(0, i + 1).join(":");
          if (!current.children.has(part)) {
            current.children.set(part, {
              name: part,
              fullPath: path,
              children: new Map(),
              keys: [],
            });
          }
          current = current.children.get(part)!;
        }
        current.keys.push(entry);
      }
    }

    return root;
  }, [keys]);

  /** 切换文件夹展开状态 */
  const toggleFolder = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  /** 定位时自动展开父级目录，并在渲染完成后滚动到叶子节点 */
  useImperativeHandle(
    ref,
    () => ({
      locateSelectedKey: () => {
        if (!selectedKey) return;

        const parentPaths = getParentPaths(selectedKey);
        setExpanded((prev) => {
          const next = new Set(prev);
          parentPaths.forEach((path) => next.add(path));
          return next;
        });

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            leafRefs.current.get(selectedKey)?.scrollIntoView({
              block: "center",
              behavior: "smooth",
            });
          });
        });
      },
    }),
    [selectedKey],
  );

  /** 渲染文件夹节点 */
  const renderFolder = (node: TreeNode, depth: number) => {
    const isExpanded = expanded.has(node.fullPath);
    const childCount = countKeys(node);
    const tone = getFolderTone(depth);

    return (
      <div key={node.fullPath}>
        <button
          className={`flex items-center gap-2 w-full py-1.5 px-2 rounded-md cursor-pointer text-sm transition-colors ${tone.row}`}
          style={{ paddingLeft: "8px" }}
          onClick={() => toggleFolder(node.fullPath)}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          )}
          <Folder className={`w-4 h-4 shrink-0 ${tone.icon}`} />
          <span className={`truncate ${tone.text}`}>{node.name}</span>
          <span className={`text-xs ml-auto shrink-0 ${tone.count}`}>
            {childCount}
          </span>
        </button>

        {isExpanded && (
          <div
            className={`border-l pl-0.5 ${tone.border}`}
            style={{ marginLeft: "10px" }}
          >
            {/* 子文件夹 */}
            {Array.from(node.children.values())
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((child) => renderFolder(child, depth + 1))}
            {/* 叶子节点 Key */}
            {node.keys
              .sort((a, b) => a.key.localeCompare(b.key))
              .map((entry) => renderLeaf(entry))}
          </div>
        )}
      </div>
    );
  };

  /** 渲染叶子节点（Key），含 checkbox 和收藏 */
  const renderLeaf = (entry: KeyEntry) => {
    const isSelected = selectedKey === entry.key;
    const isChecked = checkedKeys.has(entry.key);
    const isFavorite = favorites.has(entry.key);
    const parts = entry.key.split(":");
    const displayName = parts[parts.length - 1];

    return (
      <div
        key={entry.key}
        ref={(node) => {
          if (node) {
            leafRefs.current.set(entry.key, node);
          } else {
            leafRefs.current.delete(entry.key);
          }
        }}
        className={`flex items-center gap-1 w-full py-1.5 px-2 rounded-md cursor-pointer text-sm transition-colors group ${
          isSelected
            ? "bg-primary/15 text-primary"
            : "hover:bg-white/5 text-foreground/70"
        }`}
        style={{ paddingLeft: "12px" }}
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
        <button
          className="flex items-center gap-2 flex-1 min-w-0"
          onClick={() => onSelectKey(entry.key)}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              TYPE_COLORS[entry.key_type] || "bg-muted-foreground"
            } ${isSelected ? TYPE_GLOW[entry.key_type] || "" : ""}`}
          />
          <span className="truncate font-mono text-xs">{displayName}</span>
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
      </div>
    );
  };

  /** 递归计算 Key 数量 */
  function countKeys(node: TreeNode): number {
    let count = node.keys.length;
    for (const child of node.children.values()) {
      count += countKeys(child);
    }
    return count;
  }

  return (
    <div className="relative p-2 text-sm font-mono tracking-tight select-none">
      {/* 根级文件夹 */}
      {Array.from(tree.children.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((child) => renderFolder(child, 0))}
      {/* 根级 Key（无命名空间） */}
      {tree.keys
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((entry) => renderLeaf(entry))}
      {loading && keys.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
});
