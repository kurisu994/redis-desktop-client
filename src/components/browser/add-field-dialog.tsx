"use client";

import { useTranslation } from "react-i18next";
import { useState } from "react";
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

interface AddFieldDialogProps {
  isOpen: boolean;
  mode: "hash" | "list" | "set" | "zset" | "stream";
  onClose: () => void;
  onSave: (data: {
    field?: string;
    value: string;
    score?: number;
    position?: "head" | "tail";
  }) => Promise<void>;
}

/** 添加/编辑字段对话框 — 根据类型显示不同表单 */
export function AddFieldDialog({ isOpen, mode, onClose, onSave }: AddFieldDialogProps) {
  const { t } = useTranslation();
  const [field, setField] = useState("");
  const [value, setValue] = useState("");
  const [score, setScore] = useState("0");
  const [position, setPosition] = useState<"head" | "tail">("tail");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        field: mode === "hash" || mode === "stream" ? field : undefined,
        value,
        score: mode === "zset" ? parseFloat(score) || 0 : undefined,
        position: mode === "list" ? position : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const title = {
    hash: t("valueEditor.addField"),
    list: t("valueEditor.addElement"),
    set: t("valueEditor.addMember"),
    zset: t("valueEditor.addMember"),
    stream: t("valueEditor.addEntry"),
  }[mode];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Hash / Stream 需要 field */}
          {(mode === "hash" || mode === "stream") && (
            <div className="space-y-2">
              <Label>{t("valueEditor.field")}</Label>
              <Input
                value={field}
                onChange={(e) => setField(e.target.value)}
                autoFocus
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
              <Select value={position} onValueChange={(val) => {
                if (val === "head" || val === "tail") setPosition(val);
              }}>
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

          {/* 所有类型都需要 value */}
          <div className="space-y-2">
            <Label>{t("valueEditor.value")}</Label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus={mode !== "hash" && mode !== "stream"}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !value.trim()}
          >
            {saving && <Loader2 className="animate-spin" size={14} />}
            {t("actions.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
