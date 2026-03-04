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
  Select,
  SelectItem,
} from "@heroui/react";
import { useBrowserStore } from "@/stores/browser-store";
import { createKey } from "@/lib/tauri-api";

interface KeyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const KEY_TYPES = ["string", "hash", "list", "set", "zset", "stream"];

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
        ttl ? parseInt(ttl, 10) : undefined
      );
      onCreated();
    } catch (err) {
      console.error("创建 Key 失败:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        <ModalHeader>{t("keyDialog.createKey")}</ModalHeader>
        <ModalBody>
          <Input
            label={t("keyDialog.keyName")}
            placeholder="user:profile:1001"
            value={keyName}
            onValueChange={setKeyName}
            autoFocus
          />
          <Select
            label={t("keyDialog.keyType")}
            selectedKeys={new Set([keyType])}
            onSelectionChange={(keys) => {
              const val = Array.from(keys as Set<string>)[0];
              if (val) setKeyType(val);
            }}
          >
            {KEY_TYPES.map((type) => (
              <SelectItem key={type}>{type.toUpperCase()}</SelectItem>
            ))}
          </Select>
          <Input
            label={t("keyDialog.initialValue")}
            value={value}
            onValueChange={setValue}
          />
          <Input
            label={t("keyDialog.ttlOptional")}
            type="number"
            value={ttl}
            onValueChange={setTtl}
            placeholder="-1"
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button
            color="primary"
            onPress={handleCreate}
            isLoading={saving}
            isDisabled={!keyName.trim()}
          >
            {t("actions.create")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
