"use client";

import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from "@heroui/react";

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
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalContent>
        <ModalHeader>{t("keyDetail.setTtl")}</ModalHeader>
        <ModalBody>
          <p className="text-sm text-default-500 mb-2">
            {currentTtl < 0
              ? t("keyDetail.ttlNone")
              : t("keyDetail.ttlSeconds", { seconds: currentTtl })}
          </p>
          <Input
            label={t("keyDetail.ttlValue")}
            type="number"
            value={ttlValue}
            onValueChange={setTtlValue}
            placeholder="-1"
            autoFocus
          />
        </ModalBody>
        <ModalFooter>
          {currentTtl > 0 && (
            <Button
              variant="flat"
              color="warning"
              onPress={handlePersist}
              isLoading={saving}
            >
              {t("keyDetail.persist")}
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="light" onPress={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button
            color="primary"
            onPress={handleSave}
            isLoading={saving}
          >
            {t("actions.save")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
