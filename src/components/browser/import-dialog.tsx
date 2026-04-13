"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
  const [conflictStrategy, setConflictStrategy] = useState<
    "skip" | "overwrite" | "rename"
  >("skip");
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
        conflictStrategy,
      );
      toast.success(
        t("dataImport.importSuccess", {
          imported: result.imported,
          skipped: result.skipped,
          total: result.total,
        }),
      );
      onImportComplete();
      onClose();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setImporting(false);
    }
  }, [
    activeConnectionId,
    selectedDb,
    fileContent,
    conflictStrategy,
    onImportComplete,
    onClose,
    t,
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("dataImport.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handleSelectFile}>
              {t("dataImport.selectFile")}
            </Button>
            {fileName && (
              <span className="text-xs text-muted-foreground">
                {fileName} ({keyCount} {t("dataImport.keys")})
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("connection.conflictStrategy")}</Label>
            <Select
              value={conflictStrategy}
              onValueChange={(val) =>
                setConflictStrategy(val as "skip" | "overwrite" | "rename")
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">
                  {t("connection.conflictSkip")}
                </SelectItem>
                <SelectItem value="overwrite">
                  {t("connection.conflictOverwrite")}
                </SelectItem>
                <SelectItem value="rename">
                  {t("connection.conflictRename")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {importing && <Progress value={undefined} className="h-1" />}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={handleImport} disabled={importing || !fileContent}>
            {importing && <Loader2 className="animate-spin" size={14} />}
            {t("actions.import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
