"use client";

import { useMemo, useState } from "react";
import type { KeyEntry } from "@/stores/browser-store";
import { ChevronRight, ChevronDown, Folder } from "lucide-react";

/** Key 类型对应的颜色 */
const TYPE_COLORS: Record<string, string> = {
  string: "bg-green-500",
  hash: "bg-blue-500",
  list: "bg-orange-500",
  set: "bg-purple-500",
  zset: "bg-red-500",
  stream: "bg-cyan-500",
};

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
}

/** 树形 Key 浏览器 — 按 : 分隔符构建命名空间层级 */
export function KeyTree({ keys, selectedKey, onSelectKey }: KeyTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  /** 构建树结构 */
  const tree = useMemo(() => {
    const root: TreeNode = { name: "", fullPath: "", children: new Map(), keys: [] };

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

  /** 渲染文件夹节点 */
  const renderFolder = (node: TreeNode, depth: number) => {
    const isExpanded = expanded.has(node.fullPath);
    const childCount = countKeys(node);

    return (
      <div key={node.fullPath}>
        <button
          className="flex items-center gap-1.5 w-full py-1.5 px-2 rounded-md hover:bg-default-100 cursor-pointer text-sm transition-colors"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => toggleFolder(node.fullPath)}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-default-400 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-default-400 shrink-0" />
          )}
          <Folder className="w-4 h-4 text-warning shrink-0" />
          <span className="truncate">{node.name}</span>
          <span className="text-default-300 text-xs ml-auto shrink-0">
            {childCount}
          </span>
        </button>

        {isExpanded && (
          <div>
            {/* 子文件夹 */}
            {Array.from(node.children.values())
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((child) => renderFolder(child, depth + 1))}
            {/* 叶子节点 Key */}
            {node.keys
              .sort((a, b) => a.key.localeCompare(b.key))
              .map((entry) => renderLeaf(entry, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  /** 渲染叶子节点（Key） */
  const renderLeaf = (entry: KeyEntry, depth: number) => {
    const isSelected = selectedKey === entry.key;
    // 取 Key 的最后一段作为显示名
    const parts = entry.key.split(":");
    const displayName = parts[parts.length - 1];

    return (
      <button
        key={entry.key}
        className={`flex items-center gap-2 w-full py-1.5 px-2 rounded-md cursor-pointer text-sm transition-colors ${
          isSelected
            ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
            : "hover:bg-default-100"
        }`}
        style={{ paddingLeft: `${depth * 16 + 28}px` }}
        onClick={() => onSelectKey(entry.key)}
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            TYPE_COLORS[entry.key_type] || "bg-default-400"
          } ${isSelected ? "shadow-[0_0_6px_rgba(var(--heroui-primary-500),0.5)]" : ""}`}
        />
        <span className="truncate font-mono text-xs">{displayName}</span>
      </button>
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
    <div className="p-1 text-sm select-none">
      {/* 根级文件夹 */}
      {Array.from(tree.children.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((child) => renderFolder(child, 0))}
      {/* 根级 Key（无命名空间） */}
      {tree.keys
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((entry) => renderLeaf(entry, 0))}
    </div>
  );
}
