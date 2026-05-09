"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { KeyInfo } from "@/stores/browser-store";
import { useBrowserStore } from "@/stores/browser-store";
import {
  getStringValue,
  getStringValuePartial,
  getHashValue,
  getListValue,
  getSetValue,
  getZsetValue,
  getStreamValue,
  getJsonValue,
  setStringValue,
  setHashField,
  deleteHashField,
  addListElement,
  deleteListElement,
  addSetMember,
  deleteSetMember,
  addZsetMember,
  deleteZsetMember,
  addStreamEntry,
  deleteStreamEntry,
  setJsonValue,
} from "@/lib/tauri-api";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import {
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { AddFieldDialog } from "./add-field-dialog";
import { JsonHighlightEditor } from "./json-highlight-editor";
import { JsonValidationError } from "./json-validation-error";
import {
  focusJsonIssue,
  formatJsonWithValidation,
  HEX_MAX_BYTES,
  insertTextAtSelection,
  toHexDump,
  validateJson,
} from "./value-editor-utils";

/** 在 useEffect 中安全调用数据加载函数，避免 react-hooks/set-state-in-effect */
function useLoadEffect(
  loadFn: () => Promise<void>,
  deps: React.DependencyList,
) {
  const ref = useRef(loadFn);
  ref.current = loadFn;
  useEffect(() => {
    ref.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** 大值阈值：1MB */
const LARGE_VALUE_THRESHOLD = 1024 * 1024;
/** 预览大小：前 1KB */
const PREVIEW_SIZE = 1024;
/** 大字符串阈值（50KB），超过时关闭自动换行以减少渲染开销 */
const LARGE_STRING_THRESHOLD = 50 * 1024;
/** 表格默认每页加载条数 */
const DEFAULT_TABLE_PAGE_SIZE = 10;
/** 表格可选每页加载条数 */
const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

interface ValueViewerProps {
  keyName: string;
  keyInfo: KeyInfo;
  onValueChanged: () => void;
}

/** 值查看器 — 根据 Key 类型分发不同渲染 */
export function ValueViewer({
  keyName,
  keyInfo,
  onValueChanged,
}: ValueViewerProps) {
  const { t } = useTranslation();
  const totalCount = keyInfo.length;
  if (keyInfo.key_type === "none" || keyInfo.ttl === -2) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        {t("valueEditor.keyExpired")}
      </div>
    );
  }

  switch (keyInfo.key_type) {
    case "string":
      return (
        <StringViewer
          keyName={keyName}
          keyInfo={keyInfo}
          onValueChanged={onValueChanged}
        />
      );
    case "hash":
      return (
        <HashViewer
          keyName={keyName}
          totalCount={totalCount}
          onValueChanged={onValueChanged}
        />
      );
    case "list":
      return (
        <ListViewer
          keyName={keyName}
          totalCount={totalCount}
          onValueChanged={onValueChanged}
        />
      );
    case "set":
      return (
        <SetViewer
          keyName={keyName}
          totalCount={totalCount}
          onValueChanged={onValueChanged}
        />
      );
    case "zset":
      return (
        <ZSetViewer
          keyName={keyName}
          totalCount={totalCount}
          onValueChanged={onValueChanged}
        />
      );
    case "stream":
      return (
        <StreamViewer
          keyName={keyName}
          totalCount={totalCount}
          onValueChanged={onValueChanged}
        />
      );
    case "rejson":
      return <JsonViewer keyName={keyName} onValueChanged={onValueChanged} />;
    default:
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          {t("valueViewer.unsupportedType", { type: keyInfo.key_type })}
        </div>
      );
  }
}

// ============ 格式相关常量与工具 ============

/** 支持的所有格式 */
type ValueFormat =
  | "text"
  | "json"
  | "xml"
  | "yaml"
  | "html"
  | "css"
  | "javascript"
  | "typescript"
  | "sql"
  | "markdown"
  | "hex";

/** 格式显示标签（不走 i18n 的技术名称） */
const FORMAT_LABELS: Record<ValueFormat, string> = {
  text: "Text",
  json: "JSON",
  xml: "XML",
  yaml: "YAML",
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
  typescript: "TypeScript",
  sql: "SQL",
  markdown: "Markdown",
  hex: "Hex",
};

/** 常用格式（直接显示为按钮） */
const PRIMARY_FORMATS: ValueFormat[] = ["text", "json", "hex"];

/** 更多格式（放入下拉菜单） */
const MORE_FORMATS: ValueFormat[] = [
  "xml",
  "yaml",
  "html",
  "css",
  "javascript",
  "typescript",
  "sql",
  "markdown",
];

/** 自动检测值的格式 */
function detectFormat(val: string): ValueFormat {
  const trimmed = val.trim();
  if (!trimmed) return "text";

  // JSON
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      /* 非合法 JSON */
    }
  }

  // XML / HTML — HTML 优先（含 <!DOCTYPE 或常见标签）
  if (/^<!DOCTYPE\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed))
    return "html";
  if (
    /^<\?xml\s/i.test(trimmed) ||
    (/^<[a-zA-Z]/.test(trimmed) && /<\/[a-zA-Z]/.test(trimmed))
  )
    return "xml";

  // YAML — 含 key: value 格式且无 { }
  if (
    /^[a-zA-Z0-9_-]+\s*:/m.test(trimmed) &&
    !trimmed.startsWith("{") &&
    trimmed.includes("\n")
  ) {
    const lines = trimmed.split("\n").slice(0, 5);
    const yamlLike = lines.filter(
      (l) => /^\s*[a-zA-Z0-9_-]+\s*:/.test(l) || /^\s*-\s/.test(l),
    );
    if (yamlLike.length >= 2) return "yaml";
  }

  // CSS — 含选择器和 {}
  if (/[.#@][a-zA-Z].*\{[\s\S]*\}/m.test(trimmed)) return "css";

  // SQL — 以常见关键字开头
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\s/i.test(trimmed))
    return "sql";

  // Markdown — 含 # 标题或 []()/  **bold**
  if (/^#{1,6}\s/m.test(trimmed) || /\[.+\]\(.+\)/.test(trimmed))
    return "markdown";

  return "text";
}

// ============ String 查看器（含大值延迟加载 + 多格式显示） ============

function StringViewer({
  keyName,
  keyInfo,
  onValueChanged,
}: {
  keyName: string;
  keyInfo: KeyInfo;
  onValueChanged: () => void;
}) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const [value, setValue] = useState("");
  const [originalValue, setOriginalValue] = useState("");
  const [format, setFormat] = useState<ValueFormat>("text");
  /** 是否为大值且仅加载了预览 */
  const [isLargePreview, setIsLargePreview] = useState(false);
  /** 完整加载中 */
  const [loadingFull, setLoadingFull] = useState(false);
  /** "更多格式" 下拉菜单 */
  const [showMoreFormats, setShowMoreFormats] = useState(false);
  /** 主文本编辑区引用，用于 JSON 错误定位 */
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  /** 判断是否为大值（使用 keyInfo.length —— String 的 STRLEN 字节长度） */
  const isLargeValue = keyInfo.length > LARGE_VALUE_THRESHOLD;

  /** 加载值并自动检测格式 */
  const applyValue = useCallback((v: string, isPreview: boolean) => {
    setValue(v);
    setOriginalValue(v);
    setIsLargePreview(isPreview);
    setFormat(isPreview ? "text" : detectFormat(v));
  }, []);

  useEffect(() => {
    if (!connectionId) return;

    if (isLargeValue) {
      // 大值：先加载预览（前 PREVIEW_SIZE 字节）
      getStringValuePartial(
        connectionId,
        selectedDb,
        keyName,
        0,
        PREVIEW_SIZE - 1,
      )
        .then((v) => applyValue(v, true))
        .catch(console.error);
    } else {
      // 正常加载
      getStringValue(connectionId, selectedDb, keyName)
        .then((v) => applyValue(v, false))
        .catch(console.error);
    }
  }, [connectionId, selectedDb, keyName, isLargeValue, applyValue]);

  /** 加载完整值 */
  const handleLoadFull = async () => {
    if (!connectionId) return;
    setLoadingFull(true);
    try {
      const v = await getStringValue(connectionId, selectedDb, keyName);
      applyValue(v, false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFull(false);
    }
  };

  const handleSave = async () => {
    if (!connectionId) return;
    if (format === "json") {
      const result = validateJson(value);
      if (!result.ok) {
        focusJsonIssue(textAreaRef.current, result.issue);
        toast.error(t("valueEditor.invalidJson"));
        return;
      }
    }

    await setStringValue(connectionId, selectedDb, keyName, value);
    setOriginalValue(value);
    onValueChanged();
  };

  /** 格式化当前 JSON 文本 */
  const handleFormatJson = () => {
    const result = formatJsonWithValidation(value);
    if (result.ok) {
      setValue(result.formatted);
    } else {
      focusJsonIssue(textAreaRef.current, result.issue);
      toast.error(t("valueEditor.invalidJson"));
    }
  };

  /** 在 textarea 中按 Tab 插入两个空格，避免焦点跳出编辑区 */
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;

    e.preventDefault();
    insertTextAtSelection(e.currentTarget, value, "  ", setValue);
  };

  /** 监听 redis:save 自定义事件（由 ⌘S 快捷键触发） */
  useEffect(() => {
    const handler = () => {
      if (value !== originalValue && connectionId) {
        if (format === "json") {
          const result = validateJson(value);
          if (!result.ok) {
            focusJsonIssue(textAreaRef.current, result.issue);
            toast.error(t("valueEditor.invalidJson"));
            return;
          }
        }

        setStringValue(connectionId, selectedDb, keyName, value).then(() => {
          setOriginalValue(value);
          onValueChanged();
        });
      }
    };
    window.addEventListener("redis:save", handler);
    return () => window.removeEventListener("redis:save", handler);
  }, [
    connectionId,
    selectedDb,
    keyName,
    value,
    originalValue,
    format,
    t,
    onValueChanged,
  ]);

  const isDirty = value !== originalValue;
  const isHex = format === "hex";
  /** 值的字节长度（估算），用于决定 textarea 换行策略 */
  const valueSizeEstimate = value.length;
  const isLargeString = valueSizeEstimate > LARGE_STRING_THRESHOLD;
  /** JSON 模式下实时校验当前文本，空白内容交给保存/格式化时提示 */
  const jsonValidation = useMemo(
    () => (format === "json" && value.trim() ? validateJson(value) : null),
    [format, value],
  );
  const jsonIssue =
    jsonValidation && !jsonValidation.ok ? jsonValidation.issue : null;
  /** Hex dump 内容（仅在 hex 模式时计算，使用 useMemo 避免重复计算） */
  const hexResult = useMemo(
    () => (isHex ? toHexDump(value) : { content: "", truncated: false }),
    [isHex, value],
  );

  /** 格式化字节大小 */
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 大值预览提示 */}
      {isLargePreview && (
        <div className="flex items-center gap-3 px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-sm">
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
          <span className="text-yellow-600 dark:text-yellow-400">
            {t("valueEditor.largeValueHint", {
              size: formatSize(LARGE_VALUE_THRESHOLD),
            })}
          </span>
          <span className="text-muted-foreground text-xs">
            ({formatSize(keyInfo.length)})
          </span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            onClick={handleLoadFull}
            disabled={loadingFull}
          >
            <Download className="w-3.5 h-3.5" />
            {loadingFull
              ? t("valueEditor.loadingFull")
              : t("valueEditor.loadFull")}
          </Button>
        </div>
      )}

      {/* 格式切换栏 */}
      <div className="flex items-center gap-1 px-4 py-1.5 border-b border-border text-xs font-medium">
        {!isLargePreview && (
          <>
            {/* 常用格式按钮 */}
            {PRIMARY_FORMATS.map((f) => (
              <button
                key={f}
                type="button"
                className={`px-2 py-0.5 rounded transition-colors ${
                  format === f
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                onClick={() => setFormat(f)}
              >
                {FORMAT_LABELS[f]}
              </button>
            ))}

            {/* 分隔符 */}
            <span className="text-border mx-1">|</span>

            {/* 更多格式下拉 */}
            <div className="relative">
              <button
                type="button"
                className={`inline-flex items-center px-2 py-0.5 rounded transition-colors ${
                  MORE_FORMATS.includes(format)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                onClick={() => setShowMoreFormats(!showMoreFormats)}
              >
                {MORE_FORMATS.includes(format)
                  ? FORMAT_LABELS[format]
                  : t("valueEditor.moreFormats")}
                <ChevronDown className="ml-1 h-3 w-3" />
              </button>
              {showMoreFormats && (
                <>
                  {/* 点击外部关闭 */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMoreFormats(false)}
                  />
                  <div className="absolute left-0 top-full mt-1 z-50 min-w-[140px] bg-card border border-border rounded-lg shadow-lg py-1">
                    {MORE_FORMATS.map((f) => (
                      <button
                        key={f}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent flex items-center gap-2 ${
                          format === f ? "text-primary font-medium" : ""
                        }`}
                        onClick={() => {
                          setFormat(f);
                          setShowMoreFormats(false);
                        }}
                      >
                        {FORMAT_LABELS[f]}
                        {format === f && <span className="ml-auto">✓</span>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {format === "json" && (
              <>
                <span className="text-border mx-1">|</span>
                <button
                  type="button"
                  className="px-2 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  onClick={handleFormatJson}
                >
                  {t("valueEditor.formatJson")}
                </button>
              </>
            )}
          </>
        )}
        {isLargePreview && (
          <span className="text-muted-foreground">
            {t("valueEditor.preview")}
          </span>
        )}

        <div className="flex-1" />
        {isDirty && !isLargePreview && !isHex && (
          <Button size="sm" onClick={handleSave}>
            <Save className="w-3.5 h-3.5" />
            {t("actions.save")}
          </Button>
        )}
      </div>

      {/* 编辑器 / Hex 视图 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Hex 截断提示 */}
        {isHex && hexResult.truncated && (
          <div className="flex items-center gap-2 px-4 py-1.5 bg-yellow-500/10 border-b border-yellow-500/20 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
            <span className="text-yellow-600 dark:text-yellow-400">
              {t("valueEditor.hexTruncated", {
                size: formatSize(HEX_MAX_BYTES),
              })}
            </span>
          </div>
        )}
        <div className="flex-1 min-h-0">
          {isHex ? (
            /* Hex dump 只读视图 */
            <pre className="h-full overflow-auto bg-background p-4 font-mono text-xs leading-5 text-foreground whitespace-pre">
              {hexResult.content}
            </pre>
          ) : (
            <div className="flex h-full flex-col">
              {format === "json" ? (
                <JsonHighlightEditor
                  ref={textAreaRef}
                  value={value}
                  onValueChange={setValue}
                  onKeyDown={handleEditorKeyDown}
                  readOnly={isLargePreview}
                  wrap={isLargeString ? "off" : "soft"}
                  invalid={!!jsonIssue}
                  paddingClassName="p-4"
                  className="min-h-0 flex-1"
                />
              ) : (
                /* 主编辑区 — 原生 textarea 提供更直接的输入体验 */
                <textarea
                  ref={textAreaRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  readOnly={isLargePreview}
                  wrap={isLargeString ? "off" : "soft"}
                  spellCheck={false}
                  className="min-h-0 flex-1 resize-none border-0 bg-background p-4 font-mono text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground focus:ring-0 read-only:cursor-default"
                />
              )}
              <JsonValidationError issue={jsonIssue} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Hash 查看器 ============

function HashViewer({
  keyName,
  totalCount,
  onValueChanged,
}: {
  keyName: string;
  totalCount: number;
  onValueChanged: () => void;
}) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const [fields, setFields] = useState<{ field: string; value: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editData, setEditData] = useState<{
    field: string;
    value: string;
  } | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  /** 每页对应的 HSCAN 游标历史，用于前后翻页 */
  const [cursorHistory, setCursorHistory] = useState<number[]>([0]);

  const loadPage = useCallback(
    async (cursor: number) => {
      if (!connectionId) return;
      const result = await getHashValue(
        connectionId,
        selectedDb,
        keyName,
        cursor,
        "*",
        pageSize,
      );
      setFields(result.fields);
      return result.cursor;
    },
    [connectionId, selectedDb, keyName, pageSize],
  );

  /** 初始加载第一页 */
  const loadData = useCallback(async () => {
    if (!connectionId) return;
    setPage(0);
    setCursorHistory([0]);
    const result = await getHashValue(
      connectionId,
      selectedDb,
      keyName,
      0,
      "*",
      pageSize,
    );
    setFields(result.fields);
    // 记录下一页的游标
    if (result.cursor !== 0) {
      setCursorHistory([0, result.cursor]);
    }
  }, [connectionId, selectedDb, keyName, pageSize]);

  useLoadEffect(loadData, [connectionId, selectedDb, keyName, pageSize]);

  /** 翻页 */
  const handlePageChange = useCallback(
    async (newPage: number) => {
      const cursor = cursorHistory[newPage] ?? 0;
      const nextCursor = await loadPage(cursor);
      setPage(newPage);
      setExpandedRow(null);
      // 记录下一页游标
      if (
        nextCursor != null &&
        nextCursor !== 0 &&
        cursorHistory.length <= newPage + 1
      ) {
        setCursorHistory((prev) => [...prev, nextCursor]);
      }
    },
    [cursorHistory, loadPage],
  );

  const handleDelete = async (field: string) => {
    if (!connectionId) return;
    await deleteHashField(connectionId, selectedDb, keyName, field);
    loadData();
    onValueChanged();
  };

  /** 保存（新增或编辑，支持 field 改名）*/
  const handleSave = async (data: {
    field?: string;
    oldField?: string;
    value: string;
  }) => {
    if (!connectionId) return;
    // 如果 field 改名了，先删旧 field 再建新 field
    if (data.oldField && data.oldField !== data.field) {
      await deleteHashField(connectionId, selectedDb, keyName, data.oldField);
    }
    await setHashField(
      connectionId,
      selectedDb,
      keyName,
      data.field!,
      data.value,
    );
    setShowAdd(false);
    setEditData(null);
    loadData();
    onValueChanged();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TableView
        headers={[t("valueEditor.field"), t("valueEditor.value"), ""]}
        rows={fields.map((f, idx) => [
          <span key="f" className="text-primary font-medium">
            {f.field}
          </span>,
          <TruncatedValue
            key="v"
            value={f.value}
            expanded={expandedRow === idx}
          />,
          <RowActions key="a" onDelete={() => handleDelete(f.field)} />,
        ])}
        widths={["w-1/3", "w-1/2", "w-12"]}
        expandedRow={expandedRow}
        onRowClick={(idx) =>
          setExpandedRow((prev) => (prev === idx ? null : idx))
        }
        onRowDoubleClick={(idx) => setEditData(fields[idx])}
        addLabel={t("valueEditor.addField")}
        onAdd={() => setShowAdd(true)}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={setPageSize}
      />
      {(showAdd || editData) && (
        <AddFieldDialog
          isOpen={showAdd || !!editData}
          mode="hash"
          initialData={
            editData
              ? { field: editData.field, value: editData.value }
              : undefined
          }
          onClose={() => {
            setShowAdd(false);
            setEditData(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ============ List 查看器 ============

function ListViewer({
  keyName,
  totalCount,
  onValueChanged,
}: {
  keyName: string;
  totalCount: number;
  onValueChanged: () => void;
}) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const [items, setItems] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const loadPage = useCallback(
    async (p: number) => {
      if (!connectionId) return;
      const start = p * pageSize;
      const stop = start + pageSize - 1;
      const result = await getListValue(
        connectionId,
        selectedDb,
        keyName,
        start,
        stop,
      );
      setItems(result);
    },
    [connectionId, selectedDb, keyName, pageSize],
  );

  const loadData = useCallback(async () => {
    setPage(0);
    await loadPage(0);
  }, [loadPage]);

  useLoadEffect(loadData, [connectionId, selectedDb, keyName, pageSize]);

  const handlePageChange = useCallback(
    async (newPage: number) => {
      await loadPage(newPage);
      setPage(newPage);
      setExpandedRow(null);
    },
    [loadPage],
  );

  /** 当前页中元素的真实索引偏移 */
  const indexOffset = page * pageSize;

  const handleDelete = async (index: number) => {
    if (!connectionId) return;
    await deleteListElement(
      connectionId,
      selectedDb,
      keyName,
      indexOffset + index,
    );
    loadData();
    onValueChanged();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TableView
        headers={[t("valueEditor.index"), t("valueEditor.value"), ""]}
        rows={items.map((item, i) => [
          <span key="i" className="text-primary font-medium">
            {indexOffset + i}
          </span>,
          <TruncatedValue key="v" value={item} expanded={expandedRow === i} />,
          <RowActions key="a" onDelete={() => handleDelete(i)} />,
        ])}
        widths={["w-20", "", "w-16"]}
        expandedRow={expandedRow}
        onRowClick={(idx) =>
          setExpandedRow((prev) => (prev === idx ? null : idx))
        }
        onRowDoubleClick={(idx) => setEditIdx(idx)}
        addLabel={t("valueEditor.addElement")}
        onAdd={() => setShowAdd(true)}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={setPageSize}
      />
      {(showAdd || editIdx !== null) && (
        <AddFieldDialog
          isOpen={showAdd || editIdx !== null}
          mode="list"
          initialData={editIdx !== null ? { value: items[editIdx] } : undefined}
          onClose={() => {
            setShowAdd(false);
            setEditIdx(null);
          }}
          onSave={async (data) => {
            if (!connectionId) return;
            if (editIdx !== null) {
              // 编辑：先删再加（List 无原生 SET by index 的封装，用 delete + add）
              await deleteListElement(
                connectionId,
                selectedDb,
                keyName,
                indexOffset + editIdx,
              );
              await addListElement(
                connectionId,
                selectedDb,
                keyName,
                data.value,
                "tail",
              );
            } else {
              await addListElement(
                connectionId,
                selectedDb,
                keyName,
                data.value,
                data.position || "tail",
              );
            }
            setShowAdd(false);
            setEditIdx(null);
            loadData();
            onValueChanged();
          }}
        />
      )}
    </div>
  );
}

// ============ Set 查看器 ============

function SetViewer({
  keyName,
  totalCount,
  onValueChanged,
}: {
  keyName: string;
  totalCount: number;
  onValueChanged: () => void;
}) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const [members, setMembers] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [cursorHistory, setCursorHistory] = useState<number[]>([0]);

  const loadPage = useCallback(
    async (cursor: number) => {
      if (!connectionId) return;
      const result = await getSetValue(
        connectionId,
        selectedDb,
        keyName,
        cursor,
        "*",
        pageSize,
      );
      setMembers(result.members);
      return result.cursor;
    },
    [connectionId, selectedDb, keyName, pageSize],
  );

  const loadData = useCallback(async () => {
    if (!connectionId) return;
    setPage(0);
    setCursorHistory([0]);
    const result = await getSetValue(
      connectionId,
      selectedDb,
      keyName,
      0,
      "*",
      pageSize,
    );
    setMembers(result.members);
    if (result.cursor !== 0) {
      setCursorHistory([0, result.cursor]);
    }
  }, [connectionId, selectedDb, keyName, pageSize]);

  useLoadEffect(loadData, [connectionId, selectedDb, keyName, pageSize]);

  const handlePageChange = useCallback(
    async (newPage: number) => {
      const cursor = cursorHistory[newPage] ?? 0;
      const nextCursor = await loadPage(cursor);
      setPage(newPage);
      setExpandedRow(null);
      if (
        nextCursor != null &&
        nextCursor !== 0 &&
        cursorHistory.length <= newPage + 1
      ) {
        setCursorHistory((prev) => [...prev, nextCursor]);
      }
    },
    [cursorHistory, loadPage],
  );

  const handleDelete = async (member: string) => {
    if (!connectionId) return;
    await deleteSetMember(connectionId, selectedDb, keyName, member);
    loadData();
    onValueChanged();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TableView
        headers={[t("valueEditor.member"), ""]}
        rows={members.map((m, idx) => [
          <TruncatedValue key="m" value={m} expanded={expandedRow === idx} />,
          <RowActions key="a" onDelete={() => handleDelete(m)} />,
        ])}
        widths={["", "w-16"]}
        expandedRow={expandedRow}
        onRowClick={(idx) =>
          setExpandedRow((prev) => (prev === idx ? null : idx))
        }
        onRowDoubleClick={(idx) => setEditMember(members[idx])}
        addLabel={t("valueEditor.addMember")}
        onAdd={() => setShowAdd(true)}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={setPageSize}
      />
      {(showAdd || editMember !== null) && (
        <AddFieldDialog
          isOpen={showAdd || editMember !== null}
          mode="set"
          initialData={editMember !== null ? { value: editMember } : undefined}
          onClose={() => {
            setShowAdd(false);
            setEditMember(null);
          }}
          onSave={async (data) => {
            if (!connectionId) return;
            if (editMember !== null) {
              await deleteSetMember(
                connectionId,
                selectedDb,
                keyName,
                editMember,
              );
            }
            await addSetMember(connectionId, selectedDb, keyName, data.value);
            setShowAdd(false);
            setEditMember(null);
            loadData();
            onValueChanged();
          }}
        />
      )}
    </div>
  );
}

// ============ ZSet 查看器 ============

function ZSetViewer({
  keyName,
  totalCount,
  onValueChanged,
}: {
  keyName: string;
  totalCount: number;
  onValueChanged: () => void;
}) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const [members, setMembers] = useState<{ member: string; score: number }[]>(
    [],
  );
  const [showAdd, setShowAdd] = useState(false);
  const [editData, setEditData] = useState<{
    member: string;
    score: number;
  } | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const loadPage = useCallback(
    async (p: number) => {
      if (!connectionId) return;
      const start = p * pageSize;
      const stop = start + pageSize - 1;
      const result = await getZsetValue(
        connectionId,
        selectedDb,
        keyName,
        start,
        stop,
      );
      setMembers(result);
    },
    [connectionId, selectedDb, keyName, pageSize],
  );

  const loadData = useCallback(async () => {
    setPage(0);
    await loadPage(0);
  }, [loadPage]);

  useLoadEffect(loadData, [connectionId, selectedDb, keyName, pageSize]);

  const handlePageChange = useCallback(
    async (newPage: number) => {
      await loadPage(newPage);
      setPage(newPage);
      setExpandedRow(null);
    },
    [loadPage],
  );

  const handleDelete = async (member: string) => {
    if (!connectionId) return;
    await deleteZsetMember(connectionId, selectedDb, keyName, member);
    loadData();
    onValueChanged();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TableView
        headers={[t("valueEditor.score"), t("valueEditor.member"), ""]}
        rows={members.map((m, idx) => [
          <span key="s" className="text-primary font-medium">
            {m.score}
          </span>,
          <TruncatedValue
            key="m"
            value={m.member}
            expanded={expandedRow === idx}
          />,
          <RowActions key="a" onDelete={() => handleDelete(m.member)} />,
        ])}
        widths={["w-28", "", "w-16"]}
        expandedRow={expandedRow}
        onRowClick={(idx) =>
          setExpandedRow((prev) => (prev === idx ? null : idx))
        }
        onRowDoubleClick={(idx) => setEditData(members[idx])}
        addLabel={t("valueEditor.addMember")}
        onAdd={() => setShowAdd(true)}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={setPageSize}
      />
      {(showAdd || editData) && (
        <AddFieldDialog
          isOpen={showAdd || !!editData}
          mode="zset"
          initialData={
            editData
              ? { value: editData.member, score: editData.score }
              : undefined
          }
          onClose={() => {
            setShowAdd(false);
            setEditData(null);
          }}
          onSave={async (data) => {
            if (!connectionId) return;
            if (editData) {
              await deleteZsetMember(
                connectionId,
                selectedDb,
                keyName,
                editData.member,
              );
            }
            await addZsetMember(
              connectionId,
              selectedDb,
              keyName,
              data.value,
              data.score ?? 0,
            );
            setShowAdd(false);
            setEditData(null);
            loadData();
            onValueChanged();
          }}
        />
      )}
    </div>
  );
}

// ============ Stream 查看器 ============

function StreamViewer({
  keyName,
  totalCount,
  onValueChanged,
}: {
  keyName: string;
  totalCount: number;
  onValueChanged: () => void;
}) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const [entries, setEntries] = useState<
    { id: string; fields: [string, string][] }[]
  >([]);
  const [showAdd, setShowAdd] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  /** ID 边界历史，每项为 [startId, endId]，用于前后翻页 */
  const [idHistory, setIdHistory] = useState<string[]>(["-"]);

  const loadPage = useCallback(
    async (startId: string) => {
      if (!connectionId) return;
      const result = await getStreamValue(
        connectionId,
        selectedDb,
        keyName,
        startId,
        "+",
        pageSize,
      );
      setEntries(result);
      return result;
    },
    [connectionId, selectedDb, keyName, pageSize],
  );

  const loadData = useCallback(async () => {
    if (!connectionId) return;
    setPage(0);
    setIdHistory(["-"]);
    const result = await getStreamValue(
      connectionId,
      selectedDb,
      keyName,
      "-",
      "+",
      pageSize,
    );
    setEntries(result);
    // 记录下一页的起始 ID（最后一条的 ID + 1 毫秒时间戳的后缀）
    if (result.length === pageSize && result.length > 0) {
      const lastId = result[result.length - 1].id;
      // Stream ID 格式: timestamp-seq，用 "(" 前缀表示排除当前 ID
      const nextStartId = "(" + lastId;
      setIdHistory(["-", nextStartId]);
    }
  }, [connectionId, selectedDb, keyName, pageSize]);

  useLoadEffect(loadData, [connectionId, selectedDb, keyName, pageSize]);

  const handlePageChange = useCallback(
    async (newPage: number) => {
      const startId = idHistory[newPage] ?? "-";
      const result = await loadPage(startId);
      setPage(newPage);
      setExpandedRow(null);
      if (
        result &&
        result.length === pageSize &&
        result.length > 0 &&
        idHistory.length <= newPage + 1
      ) {
        const lastId = result[result.length - 1].id;
        const nextStartId = "(" + lastId;
        setIdHistory((prev) => [...prev, nextStartId]);
      }
    },
    [idHistory, loadPage, pageSize],
  );

  const handleDelete = async (entryId: string) => {
    if (!connectionId) return;
    await deleteStreamEntry(connectionId, selectedDb, keyName, entryId);
    loadData();
    onValueChanged();
  };

  /** 将 Stream entry 的 fields 格式化为字符串 */
  const formatFields = (fields: [string, string][]) =>
    fields.map(([k, v]) => `${k}: ${v}`).join(", ");

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <TableView
        headers={[t("valueEditor.streamId"), t("valueEditor.streamFields"), ""]}
        rows={entries.map((e, idx) => [
          <span key="id" className="text-primary font-medium text-xs">
            {e.id}
          </span>,
          <TruncatedValue
            key="f"
            value={formatFields(e.fields)}
            expanded={expandedRow === idx}
          />,
          <RowActions key="a" onDelete={() => handleDelete(e.id)} />,
        ])}
        widths={["w-44", "", "w-16"]}
        expandedRow={expandedRow}
        onRowClick={(idx) =>
          setExpandedRow((prev) => (prev === idx ? null : idx))
        }
        addLabel={t("valueEditor.addEntry")}
        onAdd={() => setShowAdd(true)}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={setPageSize}
      />
      {showAdd && (
        <AddFieldDialog
          isOpen={showAdd}
          mode="stream"
          onClose={() => setShowAdd(false)}
          onSave={async (data) => {
            if (!connectionId) return;
            const fields: [string, string][] = [
              [data.field || "data", data.value],
            ];
            await addStreamEntry(connectionId, selectedDb, keyName, fields);
            setShowAdd(false);
            loadData();
            onValueChanged();
          }}
        />
      )}
    </div>
  );
}

// ============ 通用表格组件 ============

/** 双击检测延迟（ms） */
const DOUBLE_CLICK_DELAY = 250;

function TableView({
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
function RowActions({ onDelete }: { onDelete?: () => void }) {
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
function TruncatedValue({
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

// ============ RedisJSON 查看器 ============

/** RedisJSON 查看/编辑组件 */
function JsonViewer({
  keyName,
  onValueChanged,
}: {
  keyName: string;
  onValueChanged: () => void;
}) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const [value, setValue] = useState("");
  const [originalValue, setOriginalValue] = useState("");
  const [path, setPath] = useState("$");
  const [pathInput, setPathInput] = useState("$");
  const [loading, setLoading] = useState(false);
  /** JSON 全文编辑区引用，用于错误定位 */
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  /** 加载 JSON 值 */
  const loadValue = useCallback(
    async (jsonPath: string) => {
      if (!connectionId) return;
      setLoading(true);
      try {
        const raw = await getJsonValue(
          connectionId,
          selectedDb,
          keyName,
          jsonPath,
        );
        // JSON.GET 返回的结果可能是 JSON 数组包装（如 [value]），解包并美化
        let formatted = raw;
        try {
          const parsed = JSON.parse(raw);
          // 如果是 $ 路径，JSON.GET 返回数组包装，取第一个元素
          if (Array.isArray(parsed) && jsonPath === "$") {
            formatted = JSON.stringify(parsed[0], null, 2);
          } else {
            formatted = JSON.stringify(parsed, null, 2);
          }
        } catch {
          // 非 JSON 直接使用原始值
        }
        setValue(formatted);
        setOriginalValue(formatted);
        setPath(jsonPath);
      } catch (err) {
        console.error("加载 JSON 值失败:", err);
        setValue(`Error: ${err}`);
        setOriginalValue("");
      } finally {
        setLoading(false);
      }
    },
    [connectionId, selectedDb, keyName],
  );

  useEffect(() => {
    setPathInput("$");
    loadValue("$");
  }, [keyName, loadValue]);

  /** 按回车加载指定路径 */
  const handlePathQuery = () => {
    const p = pathInput.trim() || "$";
    loadValue(p);
  };

  /** 格式化 JSON */
  const handleFormat = () => {
    const result = formatJsonWithValidation(value);
    if (result.ok) {
      setValue(result.formatted);
    } else {
      focusJsonIssue(textAreaRef.current, result.issue);
      toast.error(t("valueEditor.invalidJson"));
    }
  };

  /** 保存修改 */
  const handleSave = async () => {
    if (!connectionId) return;
    const result = validateJson(value);
    if (!result.ok) {
      focusJsonIssue(textAreaRef.current, result.issue);
      toast.error(t("valueEditor.invalidJson"));
      return;
    }

    await setJsonValue(connectionId, selectedDb, keyName, path, value);
    setOriginalValue(value);
    onValueChanged();
  };

  /** 监听 redis:save 自定义事件（由 ⌘S 快捷键触发） */
  useEffect(() => {
    const handler = () => {
      if (value !== originalValue && connectionId) {
        const result = validateJson(value);
        if (!result.ok) {
          focusJsonIssue(textAreaRef.current, result.issue);
          toast.error(t("valueEditor.invalidJson"));
          return;
        }

        setJsonValue(connectionId, selectedDb, keyName, path, value).then(
          () => {
            setOriginalValue(value);
            onValueChanged();
          },
        );
      }
    };
    window.addEventListener("redis:save", handler);
    return () => window.removeEventListener("redis:save", handler);
  }, [
    connectionId,
    selectedDb,
    keyName,
    path,
    value,
    originalValue,
    t,
    onValueChanged,
  ]);

  const isDirty = value !== originalValue;
  /** RedisJSON 编辑器始终按 JSON 规则实时校验，空白内容交给保存/格式化时提示 */
  const jsonValidation = useMemo(
    () => (value.trim() ? validateJson(value) : null),
    [value],
  );
  const jsonIssue =
    jsonValidation && !jsonValidation.ok ? jsonValidation.issue : null;

  /** 在 JSON textarea 中按 Tab 插入两个空格，避免焦点跳出编辑区 */
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;

    e.preventDefault();
    insertTextAtSelection(e.currentTarget, value, "  ", setValue);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* 路径查询 + 操作栏 */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border text-xs">
        <span className="text-muted-foreground font-medium shrink-0">
          {t("valueEditor.jsonPath")}:
        </span>
        <input
          className="flex-1 min-w-0 bg-transparent border border-border rounded px-2 py-0.5 font-mono text-xs focus:outline-none focus:border-primary"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handlePathQuery()}
          placeholder="$ | $.name | $.tags[0]"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handlePathQuery}
          disabled={loading}
          className="h-6 text-xs"
        >
          {loading ? "..." : t("actions.search")}
        </Button>

        <span className="text-border mx-1">|</span>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleFormat}
          className="h-6 text-xs"
        >
          {t("valueEditor.formatJson")}
        </Button>

        <div className="flex-1" />
        {isDirty && (
          <Button size="sm" onClick={handleSave} className="h-6 text-xs">
            <Save className="w-3 h-3" />
            {t("actions.save")}
          </Button>
        )}
      </div>

      {/* JSON 文本编辑区 */}
      <div className="flex-1 min-h-0">
        <div className="flex h-full flex-col">
          <JsonHighlightEditor
            ref={textAreaRef}
            value={value}
            onValueChange={setValue}
            onKeyDown={handleEditorKeyDown}
            invalid={!!jsonIssue}
            paddingClassName="p-4"
            className="min-h-0 flex-1"
          />
          <JsonValidationError issue={jsonIssue} />
        </div>
      </div>
    </div>
  );
}
