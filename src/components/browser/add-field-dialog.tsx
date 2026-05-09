"use client";

import { useTranslation } from "react-i18next";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { ChevronDown, Loader2 } from "lucide-react";
import { insertTextAtSelection, toHexDump } from "./value-editor-utils";

/** 编辑器支持的格式 */
type EditorFormat =
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
const EDITOR_FORMAT_LABELS: Record<EditorFormat, string> = {
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
const EDITOR_PRIMARY_FORMATS: EditorFormat[] = ["text", "json", "hex"];

/** 更多格式 */
const EDITOR_MORE_FORMATS: EditorFormat[] = [
  "xml",
  "yaml",
  "html",
  "css",
  "javascript",
  "typescript",
  "sql",
  "markdown",
];

interface AddFieldDialogProps {
  isOpen: boolean;
  mode: "hash" | "list" | "set" | "zset" | "stream";
  /** 编辑模式时的初始值 */
  initialData?: {
    field?: string;
    value?: string;
    score?: number;
  };
  onClose: () => void;
  onSave: (data: {
    field?: string;
    /** 编辑 hash 时，如果 field 改名了，传入原始 field */
    oldField?: string;
    value: string;
    score?: number;
    position?: "head" | "tail";
  }) => Promise<void>;
}

/** 自动检测值的格式 */
function detectEditorFormat(val: string): EditorFormat {
  const trimmed = val.trim();
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
  if (/^<!DOCTYPE\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed))
    return "html";
  if (
    /^<\?xml\s/i.test(trimmed) ||
    (/^<[a-zA-Z]/.test(trimmed) && /<\/[a-zA-Z]/.test(trimmed))
  )
    return "xml";
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
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\s/i.test(trimmed))
    return "sql";
  return "text";
}

/** 添加/编辑字段对话框 — 根据类型显示不同表单，value 使用原生文本编辑区 + 格式切换 */
export function AddFieldDialog({
  isOpen,
  mode,
  initialData,
  onClose,
  onSave,
}: AddFieldDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!initialData;
  const [field, setField] = useState(initialData?.field ?? "");
  const [value, setValue] = useState(initialData?.value ?? "");
  const [score, setScore] = useState(String(initialData?.score ?? 0));
  const [position, setPosition] = useState<"head" | "tail">("tail");
  const [saving, setSaving] = useState(false);
  /** 当前编辑器格式 */
  const [format, setFormat] = useState<EditorFormat>(() =>
    detectEditorFormat(initialData?.value ?? ""),
  );
  /** "更多格式" 下拉菜单 */
  const [showMoreFormats, setShowMoreFormats] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // 如果是 hash 编辑模式且 field 改了名，传入 oldField
      const oldField =
        isEdit && mode === "hash" && field !== initialData?.field
          ? initialData?.field
          : undefined;
      await onSave({
        field: mode === "hash" || mode === "stream" ? field : undefined,
        oldField,
        value,
        score: mode === "zset" ? parseFloat(score) || 0 : undefined,
        position: mode === "list" ? position : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const title = isEdit
    ? t("actions.edit")
    : {
        hash: t("valueEditor.addField"),
        list: t("valueEditor.addElement"),
        set: t("valueEditor.addMember"),
        zset: t("valueEditor.addMember"),
        stream: t("valueEditor.addEntry"),
      }[mode];

  const isHex = format === "hex";
  /** Hex dump 内容（仅在 hex 模式时计算） */
  const hexResult = useMemo(
    () => (isHex ? toHexDump(value) : { content: "", truncated: false }),
    [isHex, value],
  );

  /** 格式化当前 JSON 文本 */
  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(value);
      setValue(JSON.stringify(parsed, null, 2));
    } catch {
      toast.error(t("valueEditor.invalidJson"));
    }
  };

  /** 在 textarea 中按 Tab 插入两个空格，避免焦点跳出编辑区 */
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab") return;

    e.preventDefault();
    insertTextAtSelection(e.currentTarget, value, "  ", setValue);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Hash / Stream 需要 field — 编辑模式也可修改 */}
          {(mode === "hash" || mode === "stream") && (
            <div className="space-y-2">
              <Label>{t("valueEditor.field")}</Label>
              <Input
                value={field}
                onChange={(e) => setField(e.target.value)}
                autoFocus={!isEdit}
              />
            </div>
          )}

          {/* ZSet 需要 score */}
          {mode === "zset" && (
            <div className="space-y-2">
              <Label>{t("valueEditor.score")}</Label>
              <Input
                type="number"
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
            </div>
          )}

          {/* List 需要 position */}
          {mode === "list" && (
            <div className="space-y-2">
              <Label>{t("valueEditor.position")}</Label>
              <Select
                value={position}
                onValueChange={(val) => {
                  if (val === "head" || val === "tail") setPosition(val);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tail">{t("valueEditor.tail")}</SelectItem>
                  <SelectItem value="head">{t("valueEditor.head")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 所有类型都需要 value — 使用原生编辑区 + 格式切换栏 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("valueEditor.value")}</Label>
              {/* 格式切换栏 */}
              <div className="flex items-center gap-1 text-xs font-medium">
                {EDITOR_PRIMARY_FORMATS.map((f) => (
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
                    {EDITOR_FORMAT_LABELS[f]}
                  </button>
                ))}
                <span className="text-border mx-0.5">|</span>
                <div className="relative">
                  <button
                    type="button"
                    className={`inline-flex items-center px-2 py-0.5 rounded transition-colors ${
                      EDITOR_MORE_FORMATS.includes(format)
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                    onClick={() => setShowMoreFormats(!showMoreFormats)}
                  >
                    {EDITOR_MORE_FORMATS.includes(format)
                      ? EDITOR_FORMAT_LABELS[format]
                      : t("valueEditor.moreFormats")}
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </button>
                  {showMoreFormats && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMoreFormats(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] bg-card border border-border rounded-lg shadow-lg py-1">
                        {EDITOR_MORE_FORMATS.map((f) => (
                          <button
                            key={f}
                            type="button"
                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-accent flex items-center gap-2 ${
                              format === f ? "text-primary font-medium" : ""
                            }`}
                            onClick={() => {
                              setFormat(f);
                              setShowMoreFormats(false);
                            }}
                          >
                            {EDITOR_FORMAT_LABELS[f]}
                            {format === f && <span className="ml-auto">✓</span>}
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
                      className="px-2 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      onClick={handleFormatJson}
                    >
                      {t("valueEditor.formatJson")}
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="h-56 border border-border rounded-md overflow-hidden">
              {isHex ? (
                /* Hex dump 只读视图 */
                <pre className="h-full overflow-auto bg-background p-3 font-mono text-xs leading-5 text-foreground whitespace-pre">
                  {hexResult.content}
                </pre>
              ) : (
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  spellCheck={false}
                  className="h-full w-full resize-none border-0 bg-background p-3 font-mono text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground focus:ring-0"
                />
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || !value.trim()}>
            {saving && <Loader2 className="animate-spin" size={14} />}
            {isEdit ? t("actions.save") : t("actions.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
