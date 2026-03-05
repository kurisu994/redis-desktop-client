"use client";

import { useState, useCallback } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from "@heroui/react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";

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
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && handleClose()} size="md">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-danger" />
          <span>{title}</span>
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-600">{message}</p>
          <p className="text-sm text-default-500 mt-2">
            {t("confirm.typeToConfirm", { text: confirmText })}
          </p>
          <Input
            value={input}
            onValueChange={setInput}
            variant="bordered"
            placeholder={confirmText}
            color={input && !isMatch ? "danger" : "default"}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={handleClose}>
            {t("actions.cancel")}
          </Button>
          <Button
            color="danger"
            onPress={handleConfirm}
            isLoading={loading}
            isDisabled={!isMatch}
          >
            {t("actions.confirm")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
