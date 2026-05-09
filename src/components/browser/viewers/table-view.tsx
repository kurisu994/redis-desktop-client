"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useRef, useState, useEffect } from "react";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

/** 双击检测延迟（ms） */
const DOUBLE_CLICK_DELAY = 250;

/** 表格可选每页加载条数 */
export const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/** 通用表格组件 — 用于 Hash/List/Set/ZSet/Stream 等类型的数据展示 */
export function TableView({
  headers,
  rows,
  widths,
  expandedRow,
  onRowClick,
  onRowDoubleClick,
  addLabel,
  onAdd,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  widths: string[];
  /** 当前展开的行索引 */
  expandedRow?: number | null;
  /** 单击行回调（展开/折叠） */
  onRowClick?: (rowIdx: number) => void;
  /** 双击行回调（打开编辑弹窗） */
  onRowDoubleClick?: (rowIdx: number) => void;
  addLabel: string;
  onAdd: () => void;
  /** 分页：总条目数 */
  totalCount?: number;
  /** 分页：当前页码（0-based） */
  page?: number;
  /** 分页：每页条数 */
  pageSize?: number;
  /** 分页：翻页回调 */
  onPageChange?: (page: number) => void;
  /** 分页：每页条数变更回调 */
  onPageSizeChange?: (pageSize: number) => void;
}) {
  const { t } = useTranslation();
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 区分单击和双击 */
  const handleClick = useCallback(
    (rowIdx: number) => {
      if (clickTimerRef.current) {
        // 双击：取消单击，触发双击
        clearTimeout(clickTimerRef.current);
        clickTimerRef.current = null;
        onRowDoubleClick?.(rowIdx);
      } else {
        // 单击：延迟执行，等待可能的双击
        clickTimerRef.current = setTimeout(() => {
          clickTimerRef.current = null;
          onRowClick?.(rowIdx);
        }, DOUBLE_CLICK_DELAY);
      }
    },
    [onRowClick, onRowDoubleClick],
  );

  const hasPagination =
    totalCount != null && page != null && pageSize != null && onPageChange;
  const totalPages = hasPagination
    ? Math.max(1, Math.ceil(totalCount / pageSize))
    : 1;
  const currentPage = page ?? 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-auto p-5 pb-0">
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="text-xs uppercase font-medium tracking-wider bg-muted/50 text-muted-foreground sticky top-0">
              <tr>
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 border-b border-border ${widths[i] || ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-mono text-[13px]">
              {rows.map((cells, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={`border-b border-border/50 hover:bg-muted/30 group cursor-pointer ${
                    expandedRow === rowIdx ? "bg-muted/20" : ""
                  }`}
                  onClick={() => handleClick(rowIdx)}
                >
                  {cells.map((cell, cellIdx) => (
                    <td
                      key={cellIdx}
                      className={`px-4 py-2.5 ${
                        expandedRow !== rowIdx ? "overflow-hidden" : ""
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {/* 添加按钮在表格内部底部 */}
          <div className="px-4 py-2.5 border-t border-border/50">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              className="text-xs text-primary hover:text-primary/80 flex items-center gap-1.5 font-medium px-1 py-1 rounded hover:bg-primary/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> {addLabel}
            </button>
          </div>
        </div>
      </div>
      {/* 分页控件 */}
      {hasPagination && totalCount > 0 && (
        <div className="flex items-center justify-between gap-3 px-5 py-2 border-t border-border text-xs text-muted-foreground shrink-0">
          <span>
            {t("pagination.showing", {
              from: currentPage * pageSize + 1,
              to: Math.min((currentPage + 1) * pageSize, totalCount),
              total: totalCount,
            })}
          </span>
          <div className="flex items-center gap-3">
            {onPageSizeChange && (
              <label className="flex items-center gap-1.5">
                <span>{t("pagination.perPage")}</span>
                <select
                  value={pageSize}
                  onChange={(event) =>
                    onPageSizeChange(Number(event.target.value))
                  }
                  className="h-7 rounded border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                >
                  {TABLE_PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={currentPage <= 0}
              onClick={() => onPageChange(currentPage - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-foreground">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              className="p-1 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              disabled={currentPage >= totalPages - 1}
              onClick={() => onPageChange(currentPage + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 行操作按钮 — 仅删除 */
export function RowActions({ onDelete }: { onDelete?: () => void }) {
  return (
    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-muted-foreground hover:text-red-400 p-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/** 可截断的值显示组件 — 默认单行截断，展开时完整显示，截断时 hover 显示 Tooltip */
export function TruncatedValue({
  value,
  expanded,
  className,
}: {
  value: string;
  expanded: boolean;
  className?: string;
}) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (el && !expanded) {
      setIsTruncated(el.scrollWidth > el.clientWidth);
    }
  }, [value, expanded]);

  if (expanded) {
    return (
      <span
        className={`block whitespace-pre-wrap break-all text-foreground/80 font-mono text-xs max-h-40 overflow-auto ${className || ""}`}
      >
        {value}
      </span>
    );
  }

  const truncatedEl = (
    <span
      ref={textRef}
      className={`block truncate text-foreground/80 font-mono text-xs ${className || ""}`}
    >
      {value}
    </span>
  );

  if (!isTruncated) return truncatedEl;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{truncatedEl}</TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="start"
        className="max-w-md max-h-60 overflow-auto"
      >
        <pre className="whitespace-pre-wrap text-xs font-mono break-all">
          {value}
        </pre>
      </TooltipContent>
    </Tooltip>
  );
}
