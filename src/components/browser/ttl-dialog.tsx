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
import { Loader2 } from "lucide-react";

interface TtlDialogProps {
  isOpen: boolean;
  currentTtl: number;
  onClose: () => void;
  onSave: (ttl: number) => Promise<void>;
}

/** TTL 管理对话框 — 设置/修改/移除 TTL */
export function TtlDialog({ isOpen, currentTtl, onClose, onSave }: TtlDialogProps) {
  const { t } = useTranslation();
  const [ttlValue, setTtlValue] = useState(
    currentTtl > 0 ? String(currentTtl) : ""
  );
  const [saving, setSaving] = useState(false);

  /** 保存 TTL */
  const handleSave = async () => {
    setSaving(true);
    try {
      const ttl = ttlValue ? parseInt(ttlValue, 10) : -1;
      await onSave(ttl);
    } finally {
      setSaving(false);
    }
  };

  /** 移除 TTL（持久化） */
  const handlePersist = async () => {
    setSaving(true);
    try {
      await onSave(-1);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("keyDetail.setTtl")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            {currentTtl < 0
              ? t("keyDetail.ttlNone")
              : t("keyDetail.ttlSeconds", { seconds: currentTtl })}
          </p>
          <div className="space-y-2">
            <Label>{t("keyDetail.ttlValue")}</Label>
            <Input
              type="number"
              value={ttlValue}
              onChange={(e) => setTtlValue(e.target.value)}
              placeholder="-1"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          {currentTtl > 0 && (
            <Button
              variant="secondary"
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
              onClick={handlePersist}
              disabled={saving}
            >
              {saving && <Loader2 className="animate-spin" size={14} />}
              {t("keyDetail.persist")}
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving && <Loader2 className="animate-spin" size={14} />}
            {t("actions.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
