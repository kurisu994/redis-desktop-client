"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { KeyInfo } from "@/stores/browser-store";
import { useBrowserStore } from "@/stores/browser-store";
import {
  getStringValue,
  getStringValuePartial,
  setStringValue,
} from "@/lib/tauri-api";
import { Button } from "@/components/ui/button";
import {
  Save,
  AlertTriangle,
  Download,
  ChevronDown,
} from "lucide-react";
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

// ============ 格式相关常量与工具 ============

/** 大值阈值：1MB */
const LARGE_VALUE_THRESHOLD = 1024 * 1024;
/** 预览大小：前 1KB */
const PREVIEW_SIZE = 1024;
/** 大字符串阈值（50KB），超过时关闭自动换行以减少渲染开销 */
const LARGE_STRING_THRESHOLD = 50 * 1024;

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

/** String 类型值查看/编辑器 */
export function StringViewer({
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
