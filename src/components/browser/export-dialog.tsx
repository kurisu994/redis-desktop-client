"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Progress,
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { useConnectionStore } from "@/stores/connection-store";
import { useBrowserStore } from "@/stores/browser-store";
import { exportKeys } from "@/lib/tauri-api";

/** 数据导出对话框 */
export function ExportDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { activeConnectionId } = useConnectionStore();
  const { selectedDb, keys } = useBrowserStore();
  const [pattern, setPattern] = useState("*");
  const [exporting, setExporting] = useState(false);

  /** 根据模式匹配筛选 Key */
  const matchingKeys = keys.filter((k) => {
    if (pattern === "*") return true;
    const regex = new RegExp(
      "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
    );
    return regex.test(k.key);
  });

  /** 导出 */
  const handleExport = useCallback(async () => {
    if (!activeConnectionId || matchingKeys.length === 0) return;
    try {
      setExporting(true);
      const keyNames = matchingKeys.map((k) => k.key);
      const json = await exportKeys(activeConnectionId, selectedDb, keyNames);

      // 在 Tauri 环境中使用文件保存对话框，浏览器环境中下载
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        const path = await save({
          defaultPath: `redis-export-db${selectedDb}.json`,
          filters: [{ name: "JSON", extensions: ["json"] }],
        });
        if (path) {
          await writeTextFile(path, json);
          addToast({ title: t("dataExport.exportSuccess"), color: "success" });
          onClose();
        }
      } else {
        // 浏览器下载
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `redis-export-db${selectedDb}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast({ title: t("dataExport.exportSuccess"), color: "success" });
        onClose();
      }
    } catch (err) {
      addToast({ title: String(err), color: "danger" });
    } finally {
      setExporting(false);
    }
  }, [activeConnectionId, selectedDb, matchingKeys, onClose, t]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>{t("dataExport.title")}</ModalHeader>
        <ModalBody>
          <Input
            label={t("dataExport.pattern")}
            placeholder="*"
            value={pattern}
            onValueChange={setPattern}
            size="sm"
          />
          <p className="text-xs text-default-500">
            {t("dataExport.matchCount", { count: matchingKeys.length })}
          </p>
          {exporting && <Progress isIndeterminate size="sm" />}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button
            color="primary"
            onPress={handleExport}
            isLoading={exporting}
            isDisabled={matchingKeys.length === 0}
          >
            {t("actions.export")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
