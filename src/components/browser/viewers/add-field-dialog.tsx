"use client";

import { useTranslation } from "react-i18next";
import { useRef, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { focusJsonIssue, validateJson } from "./value-editor-utils";
import {
  detectValueEditorFormat,
  ValueFormatEditor,
  type ValueEditorFormat,
} from "./value-format-editor";

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
  const [format, setFormat] = useState<ValueEditorFormat>(() =>
    detectValueEditorFormat(initialData?.value ?? ""),
  );
  /** 值编辑区引用，用于 JSON 错误定位 */
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = async () => {
    if (format === "json") {
      const result = validateJson(value);
      if (!result.ok) {
        focusJsonIssue(textAreaRef.current, result.issue);
        toast.error(t("valueEditor.invalidJson"));
        return;
      }
    }

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
          <ValueFormatEditor
            label={<Label>{t("valueEditor.value")}</Label>}
            value={value}
            onValueChange={setValue}
            format={format}
            onFormatChange={setFormat}
            editorRef={textAreaRef}
          />
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
