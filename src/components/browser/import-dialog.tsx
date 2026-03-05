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
  Select,
  SelectItem,
  Progress,
} from "@heroui/react";
import { addToast } from "@heroui/toast";
import { useConnectionStore } from "@/stores/connection-store";
import { useBrowserStore } from "@/stores/browser-store";
import { importKeys } from "@/lib/tauri-api";

/** 数据导入对话框 */
export function ImportDialog({
  isOpen,
  onClose,
  onImportComplete,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}) {
  const { t } = useTranslation();
  const { activeConnectionId } = useConnectionStore();
  const { selectedDb } = useBrowserStore();
  const [conflictStrategy, setConflictStrategy] = useState<"skip" | "overwrite" | "rename">("skip");
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [keyCount, setKeyCount] = useState(0);
  const [importing, setImporting] = useState(false);

  /** 选择文件 */
  const handleSelectFile = useCallback(async () => {
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const { readTextFile } = await import("@tauri-apps/plugin-fs");
      const path = await open({
        filters: [{ name: "JSON", extensions: ["json"] }],
        multiple: false,
      });
      if (path) {
        const content = await readTextFile(path as string);
        setFileContent(content);
        setFileName((path as string).split("/").pop() || "file.json");
        try {
          const data = JSON.parse(content);
          setKeyCount(data.keys?.length || 0);
        } catch {
          setKeyCount(0);
        }
      }
    } else {
      // 浏览器环境：使用 file input
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const content = await file.text();
        setFileContent(content);
        setFileName(file.name);
        try {
          const data = JSON.parse(content);
          setKeyCount(data.keys?.length || 0);
        } catch {
          setKeyCount(0);
        }
      };
      input.click();
    }
  }, []);

  /** 导入 */
  const handleImport = useCallback(async () => {
    if (!activeConnectionId || !fileContent) return;
    try {
      setImporting(true);
      const result = await importKeys(
        activeConnectionId,
        selectedDb,
        fileContent,
        conflictStrategy
      );
      addToast({
        title: t("dataImport.importSuccess", {
          imported: result.imported,
          skipped: result.skipped,
          total: result.total,
        }),
        color: "success",
      });
      onImportComplete();
      onClose();
    } catch (err) {
      addToast({ title: String(err), color: "danger" });
    } finally {
      setImporting(false);
    }
  }, [activeConnectionId, selectedDb, fileContent, conflictStrategy, onImportComplete, onClose, t]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>{t("dataImport.title")}</ModalHeader>
        <ModalBody>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="flat" onPress={handleSelectFile}>
              {t("dataImport.selectFile")}
            </Button>
            {fileName && (
              <span className="text-xs text-default-500">
                {fileName} ({keyCount} {t("dataImport.keys")})
              </span>
            )}
          </div>

          <Select
            label={t("connection.conflictStrategy")}
            size="sm"
            selectedKeys={new Set([conflictStrategy])}
            onSelectionChange={(keys) => {
              const val = Array.from(keys)[0] as "skip" | "overwrite" | "rename";
              setConflictStrategy(val);
            }}
          >
            <SelectItem key="skip">{t("connection.conflictSkip")}</SelectItem>
            <SelectItem key="overwrite">{t("connection.conflictOverwrite")}</SelectItem>
            <SelectItem key="rename">{t("connection.conflictRename")}</SelectItem>
          </Select>

          {importing && <Progress isIndeterminate size="sm" />}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button
            color="primary"
            onPress={handleImport}
            isLoading={importing}
            isDisabled={!fileContent}
          >
            {t("actions.import")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
