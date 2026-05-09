"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useBrowserStore } from "@/stores/browser-store";
import { getJsonValue, setJsonValue } from "@/lib/tauri-api";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
import { JsonHighlightEditor } from "./json-highlight-editor";
import { JsonValidationError } from "./json-validation-error";
import {
  focusJsonIssue,
  formatJsonWithValidation,
  insertTextAtSelection,
  validateJson,
} from "./value-editor-utils";

// ============ RedisJSON 查看器 ============

/** RedisJSON 查看/编辑组件 */
export function JsonViewer({
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
