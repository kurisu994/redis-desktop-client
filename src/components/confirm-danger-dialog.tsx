"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDangerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** 确认后执行的操作 */
  onConfirm: () => void | Promise<void>;
  /** 对话框标题 */
  title: string;
  /** 提示信息 */
  message: string;
  /** 需要用户输入的确认文本 */
  confirmText: string;
}

/** 危险操作确认对话框 — 用户需输入确认文本才能执行 */
export function ConfirmDangerDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
}: ConfirmDangerDialogProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const isMatch = input === confirmText;

  const handleConfirm = useCallback(async () => {
    if (!isMatch) return;
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error("操作失败:", err);
    } finally {
      setLoading(false);
      setInput("");
    }
  }, [isMatch, onConfirm, onClose]);

  const handleClose = () => {
    setInput("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-destructive" />
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{message}</p>
          <p className="text-sm text-muted-foreground">
            {t("confirm.typeToConfirm", { text: confirmText })}
          </p>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={confirmText}
            className={input && !isMatch ? "border-destructive" : ""}
          />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose}>
            {t("actions.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !isMatch}
          >
            {loading && <Loader2 className="animate-spin" size={14} />}
            {t("actions.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
