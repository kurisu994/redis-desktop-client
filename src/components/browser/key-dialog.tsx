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
import { useBrowserStore } from "@/stores/browser-store";
import { createKey } from "@/lib/tauri-api";

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
];

/** 新建 Key 对话框 */
export function KeyDialog({ isOpen, onClose, onCreated }: KeyDialogProps) {
  const { t } = useTranslation();
  const { connectionId, selectedDb } = useBrowserStore();
  const [keyName, setKeyName] = useState("");
  const [keyType, setKeyType] = useState("string");
  const [value, setValue] = useState("");
  const [ttl, setTtl] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!connectionId || !keyName.trim()) return;
    setSaving(true);
    try {
      await createKey(
        connectionId,
        selectedDb,
        keyName.trim(),
        keyType,
        value || "",
        ttl ? parseInt(ttl, 10) : undefined,
      );
      onCreated();
    } catch (err) {
      console.error("创建 Key 失败:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("keyDialog.createKey")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
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
            <Select value={keyType} onValueChange={setKeyType}>
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
            <Label>{t("keyDialog.initialValue")}</Label>
            <Input value={value} onChange={(e) => setValue(e.target.value)} />
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
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleCreate} disabled={saving || !keyName.trim()}>
            {saving && <Loader2 className="animate-spin" size={14} />}
            {t("actions.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
