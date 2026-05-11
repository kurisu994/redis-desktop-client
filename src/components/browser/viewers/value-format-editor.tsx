"use client";

import {
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

/** 编辑器支持的值格式 */
export type ValueEditorFormat =
  | "text"
  | "json"
  | "hex"
  | "xml"
  | "yaml"
  | "html"
  | "css"
  | "javascript"
  | "typescript"
  | "sql"
  | "markdown";

/** 格式显示标签 */
const VALUE_EDITOR_FORMAT_LABELS: Record<ValueEditorFormat, string> = {
  text: "Text",
  json: "JSON",
  hex: "Hex",
  xml: "XML",
  yaml: "YAML",
  html: "HTML",
  css: "CSS",
  javascript: "JavaScript",
  typescript: "TypeScript",
  sql: "SQL",
  markdown: "Markdown",
};

/** 常用格式 */
const VALUE_EDITOR_PRIMARY_FORMATS: ValueEditorFormat[] = [
  "text",
  "json",
  "hex",
];

/** 更多格式 */
const VALUE_EDITOR_MORE_FORMATS: ValueEditorFormat[] = [
  "xml",
  "yaml",
  "html",
  "css",
  "javascript",
  "typescript",
  "sql",
  "markdown",
];

interface ValueFormatEditorProps {
  label?: ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  format: ValueEditorFormat;
  onFormatChange: (format: ValueEditorFormat) => void;
  editorRef?: RefObject<HTMLTextAreaElement | null>;
  className?: string;
  heightClassName?: string;
  paddingClassName?: string;
  readOnly?: boolean;
}

/** 自动检测值的编辑格式 */
export function detectValueEditorFormat(value: string): ValueEditorFormat {
  const trimmed = value.trim();
  if (!trimmed) return "text";

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

  if (/^<!DOCTYPE\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    return "html";
  }
  if (
    /^<\?xml\s/i.test(trimmed) ||
    (/^<[a-zA-Z]/.test(trimmed) && /<\/[a-zA-Z]/.test(trimmed))
  ) {
    return "xml";
  }
  if (
    /^[a-zA-Z0-9_-]+\s*:/m.test(trimmed) &&
    !trimmed.startsWith("{") &&
    trimmed.includes("\n")
  ) {
    const lines = trimmed.split("\n").slice(0, 5);
    const yamlLike = lines.filter(
      (line) => /^\s*[a-zA-Z0-9_-]+\s*:/.test(line) || /^\s*-\s/.test(line),
    );
    if (yamlLike.length >= 2) return "yaml";
  }
  if (/[.#@][a-zA-Z].*\{[\s\S]*\}/m.test(trimmed)) return "css";
  if (
    /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\s/i.test(trimmed)
  ) {
    return "sql";
  }
  if (/^#{1,6}\s/m.test(trimmed) || /\[.+\]\(.+\)/.test(trimmed)) {
    return "markdown";
  }

  return "text";
}

/** 格式化字节大小，用于 Hex 截断提示 */
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 多格式值编辑器，复用新增和编辑弹窗的输入体验 */
export function ValueFormatEditor({
  label,
  value,
  onValueChange,
  format,
  onFormatChange,
  editorRef,
  className,
  heightClassName = "h-56",
  paddingClassName = "p-3",
  readOnly = false,
}: ValueFormatEditorProps) {
  const { t } = useTranslation();
  const [showMoreFormats, setShowMoreFormats] = useState(false);
  const isHex = format === "hex";
  const jsonValidation = useMemo(
    () => (format === "json" && value.trim() ? validateJson(value) : null),
    [format, value],
  );
  const jsonIssue =
    jsonValidation && !jsonValidation.ok ? jsonValidation.issue : null;
  const hexResult = useMemo(
    () => (isHex ? toHexDump(value) : { content: "", truncated: false }),
    [isHex, value],
  );

  /** 格式化当前 JSON 文本 */
  const handleFormatJson = () => {
    const result = formatJsonWithValidation(value);
    if (result.ok) {
      onValueChange(result.formatted);
    } else {
      focusJsonIssue(editorRef?.current ?? null, result.issue);
      toast.error(t("valueEditor.invalidJson"));
    }
  };

  /** 在 textarea 中按 Tab 插入两个空格，避免焦点跳出编辑区 */
  const handleEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Tab") return;

    event.preventDefault();
    insertTextAtSelection(event.currentTarget, value, "  ", onValueChange);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {label ? (
          <div className="text-sm font-medium leading-none">{label}</div>
        ) : (
          <div />
        )}
        <div className="flex flex-wrap items-center justify-end gap-1 text-xs font-medium">
          {VALUE_EDITOR_PRIMARY_FORMATS.map((item) => (
            <button
              key={item}
              type="button"
              className={cn(
                "px-2 py-0.5 rounded transition-colors",
                format === item
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
              onClick={() => onFormatChange(item)}
            >
              {VALUE_EDITOR_FORMAT_LABELS[item]}
            </button>
          ))}
          <span className="text-border mx-0.5">|</span>
          <div className="relative">
            <button
              type="button"
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded transition-colors",
                VALUE_EDITOR_MORE_FORMATS.includes(format)
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
              onClick={() => setShowMoreFormats((open) => !open)}
            >
              {VALUE_EDITOR_MORE_FORMATS.includes(format)
                ? VALUE_EDITOR_FORMAT_LABELS[format]
                : t("valueEditor.moreFormats")}
              <ChevronDown className="ml-1 h-3 w-3" />
            </button>
            {showMoreFormats && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMoreFormats(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-lg border border-border bg-card py-1 shadow-lg">
                  {VALUE_EDITOR_MORE_FORMATS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-accent",
                        format === item ? "text-primary font-medium" : "",
                      )}
                      onClick={() => {
                        onFormatChange(item);
                        setShowMoreFormats(false);
                      }}
                    >
                      {VALUE_EDITOR_FORMAT_LABELS[item]}
                      {format === item && <Check className="ml-auto h-3 w-3" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {format === "json" && (
            <>
              <span className="text-border mx-0.5">|</span>
              <button
                type="button"
                className="px-2 py-0.5 rounded text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                onClick={handleFormatJson}
              >
                {t("valueEditor.formatJson")}
              </button>
            </>
          )}
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden rounded-md border border-border",
          heightClassName,
        )}
      >
        {isHex ? (
          <div className="flex h-full flex-col">
            {hexResult.truncated && (
              <div className="flex items-center gap-2 border-b border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
                <span className="text-yellow-600 dark:text-yellow-400">
                  {t("valueEditor.hexTruncated", {
                    size: formatSize(HEX_MAX_BYTES),
                  })}
                </span>
              </div>
            )}
            <pre className="min-h-0 flex-1 overflow-auto bg-background p-3 font-mono text-xs leading-5 text-foreground whitespace-pre">
              {hexResult.content}
            </pre>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            {format === "json" ? (
              <JsonHighlightEditor
                ref={editorRef}
                value={value}
                onValueChange={onValueChange}
                onKeyDown={handleEditorKeyDown}
                readOnly={readOnly}
                invalid={!!jsonIssue}
                paddingClassName={paddingClassName}
                className="min-h-0 flex-1"
              />
            ) : (
              <textarea
                ref={editorRef}
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
                onKeyDown={handleEditorKeyDown}
                readOnly={readOnly}
                spellCheck={false}
                className={cn(
                  "min-h-0 flex-1 resize-none border-0 bg-background font-mono text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground focus:ring-0 read-only:cursor-default",
                  paddingClassName,
                )}
              />
            )}
            <JsonValidationError issue={jsonIssue} />
          </div>
        )}
      </div>
    </div>
  );
}
