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
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>
          {/* Hash / Stream 需要 field */}
          {(mode === "hash" || mode === "stream") && (
            <Input
              label={t("valueEditor.field")}
              value={field}
              onValueChange={setField}
              autoFocus
            />
          )}

          {/* ZSet 需要 score */}
          {mode === "zset" && (
            <Input
              label={t("valueEditor.score")}
              type="number"
              value={score}
              onValueChange={setScore}
            />
          )}

          {/* List 需要 position */}
          {mode === "list" && (
            <Select
              label={t("valueEditor.position")}
              selectedKeys={new Set([position])}
              onSelectionChange={(keys) => {
                const val = Array.from(keys as Set<string>)[0];
                if (val === "head" || val === "tail") setPosition(val);
              }}
            >
              <SelectItem key="tail">{t("valueEditor.tail")}</SelectItem>
              <SelectItem key="head">{t("valueEditor.head")}</SelectItem>
            </Select>
          )}

          {/* 所有类型都需要 value */}
          <Input
            label={t("valueEditor.value")}
            value={value}
            onValueChange={setValue}
            autoFocus={mode !== "hash" && mode !== "stream"}
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button
            color="primary"
            onPress={handleSave}
            isLoading={saving}
            isDisabled={!value.trim()}
          >
            {t("actions.add")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
