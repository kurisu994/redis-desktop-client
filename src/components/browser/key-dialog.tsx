"use client";

import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useEffect, useRef, useState } from "react";
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
import { useBrowserStore } from "@/stores/browser-store";
import { createKey } from "@/lib/tauri-api";
import { focusJsonIssue, validateJson } from "./viewers/value-editor-utils";
import {
  ValueFormatEditor,
  type ValueEditorFormat,
} from "./viewers/value-format-editor";

interface KeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const KEY_TYPES = [
  "string",
  "hash",
  "list",
  "set",
  "zset",
  "stream",
  "ReJSON-RL",
] as const;

type KeyType = (typeof KEY_TYPES)[number];

/** 根据 Key 类型返回初始值输入区的标签 */
function getInitialValueLabel(t: TFunction, keyType: KeyType) {
  if (keyType === "list") return t("keyDialog.initialElement");
  if (keyType === "set" || keyType === "zset")
    return t("keyDialog.initialMember");
  return t("keyDialog.initialValue");
}

/** 新建 Key 对话框 */
export function KeyDialog({ isOpen, onClose, onCreated }: KeyDialogProps) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const [keyName, setKeyName] = useState("");
  const [keyType, setKeyType] = useState<KeyType>("string");
  const [value, setValue] = useState("");
  const [field, setField] = useState("field1");
  const [score, setScore] = useState("0");
  const [position, setPosition] = useState<"head" | "tail">("tail");
  const [format, setFormat] = useState<ValueEditorFormat>("text");
  const [ttl, setTtl] = useState("");
  const [saving, setSaving] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const requiresField = keyType === "hash" || keyType === "stream";
  const isJsonKey = keyType === "ReJSON-RL";
  const canCreate =
    !!keyName.trim() &&
    (!requiresField || !!field.trim()) &&
    (!isJsonKey || !!value.trim());

  useEffect(() => {
    if (keyType === "hash") {
      setField((current) =>
        !current.trim() || current === "data" ? "field1" : current,
      );
    }
    if (keyType === "stream") {
      setField((current) =>
        !current.trim() || current === "field1" ? "data" : current,
      );
    }
    if (keyType === "ReJSON-RL") {
      setFormat("json");
      setValue((current) => (current.trim() ? current : "{}"));
    }
  }, [keyType]);

  const handleCreate = async () => {
    if (!connectionId || !canCreate) return;
    if (format === "json" || isJsonKey) {
      const result = validateJson(value);
      if (!result.ok) {
        focusJsonIssue(textAreaRef.current, result.issue);
        toast.error(t("valueEditor.invalidJson"));
        return;
      }
    }

    setSaving(true);
    try {
      const parsedTtl = ttl.trim() ? parseInt(ttl, 10) : undefined;
      await createKey({
        id: connectionId,
        db: selectedDb,
        key: keyName.trim(),
        keyType,
        value: value || "",
        ttl: Number.isNaN(parsedTtl) ? undefined : parsedTtl,
        field: requiresField ? field.trim() : undefined,
        score: keyType === "zset" ? parseFloat(score) || 0 : undefined,
        position: keyType === "list" ? position : undefined,
      });
      onCreated();
    } catch (err) {
      console.error("创建 Key 失败:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("keyDialog.createKey")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-[1fr_180px_160px]">
            <div className="space-y-2">
              <Label>{t("keyDialog.keyName")}</Label>
              <Input
                placeholder="user:profile:1001"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>{t("keyDialog.keyType")}</Label>
              <Select
                value={keyType}
                onValueChange={(next) => setKeyType(next as KeyType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KEY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("keyDialog.ttlOptional")}</Label>
              <Input
                type="number"
                value={ttl}
                onChange={(e) => setTtl(e.target.value)}
                placeholder="-1"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {requiresField && (
              <div className="space-y-2">
                <Label>
                  {keyType === "stream"
                    ? t("keyDialog.streamField")
                    : t("keyDialog.initialField")}
                </Label>
                <Input
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  placeholder={keyType === "stream" ? "data" : "field1"}
                />
              </div>
            )}
            {keyType === "zset" && (
              <div className="space-y-2">
                <Label>{t("valueEditor.score")}</Label>
                <Input
                  type="number"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
              </div>
            )}
            {keyType === "list" && (
              <div className="space-y-2">
                <Label>{t("valueEditor.position")}</Label>
                <Select
                  value={position}
                  onValueChange={(next) => {
                    if (next === "head" || next === "tail") setPosition(next);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tail">
                      {t("valueEditor.tail")}
                    </SelectItem>
                    <SelectItem value="head">
                      {t("valueEditor.head")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <ValueFormatEditor
            label={<Label>{getInitialValueLabel(t, keyType)}</Label>}
            value={value}
            onValueChange={setValue}
            format={format}
            onFormatChange={setFormat}
            editorRef={textAreaRef}
            heightClassName="h-[320px]"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleCreate} disabled={saving || !canCreate}>
            {saving && <Loader2 className="animate-spin" size={14} />}
            {t("actions.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
