"use client";

import { useState, useCallback } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Checkbox,
  CheckboxGroup,
} from "@heroui/react";
import { useTranslation } from "react-i18next";
import { useConnectionStore } from "@/stores/connection-store";
import { exportConnections } from "@/lib/tauri-api";
import { Download } from "lucide-react";

/** 连接配置导出对话框 */
export function ExportConnectionsDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { connections } = useConnectionStore();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [includePassword, setIncludePassword] = useState(false);
  const [exporting, setExporting] = useState(false);

  /** 全选/取消全选 */
  const toggleAll = () => {
    if (selectedIds.length === connections.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(connections.map((c) => c.id));
    }
  };

  /** 执行导出 */
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const ids = selectedIds.length === connections.length ? undefined : selectedIds;
      const json = await exportConnections(ids, includePassword);

      // 使用 Tauri 文件对话框保存，或在浏览器端直接下载
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        const filePath = await save({
          defaultPath: "redis-connections.json",
          filters: [{ name: "JSON", extensions: ["json"] }],
        });
        if (filePath) {
          await writeTextFile(filePath, json);
        }
      } else {
        // 浏览器 mock：下载 JSON
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "redis-connections.json";
        a.click();
        URL.revokeObjectURL(url);
      }
      onClose();
    } catch (err) {
      console.error("导出连接失败:", err);
    } finally {
      setExporting(false);
    }
  }, [selectedIds, includePassword, connections.length, onClose]);

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()} size="md">
      <ModalContent>
        <ModalHeader>{t("connection.exportConnections")}</ModalHeader>
        <ModalBody>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-default-500">
              {t("browser.totalKeys", { count: selectedIds.length })}
            </span>
            <Button size="sm" variant="light" onPress={toggleAll}>
              {selectedIds.length === connections.length
                ? t("actions.cancel")
                : "全选"}
            </Button>
          </div>
          <CheckboxGroup
            value={selectedIds}
            onValueChange={setSelectedIds}
            className="max-h-60 overflow-y-auto"
          >
            {connections.map((c) => (
              <Checkbox key={c.id} value={c.id}>
                <span className="text-sm">{c.name || c.host}</span>
                <span className="text-xs text-default-400 ml-2">
                  {c.host}:{c.port}
                </span>
              </Checkbox>
            ))}
          </CheckboxGroup>
          <Checkbox
            isSelected={includePassword}
            onValueChange={setIncludePassword}
            className="mt-2"
            size="sm"
            color="warning"
          >
            {t("connection.includePassword")}
          </Checkbox>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button
            color="primary"
            onPress={handleExport}
            isLoading={exporting}
            isDisabled={selectedIds.length === 0}
            startContent={<Download size={16} />}
          >
            {t("actions.export")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
