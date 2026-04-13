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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useConnectionStore } from "@/stores/connection-store";
import { importConnections, listConnections } from "@/lib/tauri-api";
import { Upload, Loader2 } from "lucide-react";

/** 连接配置导入对话框 */
export function ImportConnectionsDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { setConnections } = useConnectionStore();
  const [jsonContent, setJsonContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [previewCount, setPreviewCount] = useState(0);
  const [conflictStrategy, setConflictStrategy] = useState<
    "skip" | "overwrite" | "rename"
  >("skip");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  /** 选择文件 */
  const handleSelectFile = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const { readTextFile } = await import("@tauri-apps/plugin-fs");
        const filePath = await open({
          filters: [{ name: "JSON", extensions: ["json"] }],
          multiple: false,
        });
        if (filePath) {
          const content = await readTextFile(filePath as string);
          setJsonContent(content);
          setFileName((filePath as string).split("/").pop() || "");
          try {
            const data = JSON.parse(content);
            setPreviewCount(data.connections?.length || 0);
          } catch {
            setPreviewCount(0);
          }
        }
      } else {
        // 浏览器 mock：使用 file input
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".json";
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = () => {
              const content = reader.result as string;
              setJsonContent(content);
              try {
                const data = JSON.parse(content);
                setPreviewCount(data.connections?.length || 0);
              } catch {
                setPreviewCount(0);
              }
            };
            reader.readAsText(file);
          }
        };
        input.click();
      }
    } catch (err) {
      console.error("选择文件失败:", err);
    }
  }, []);

  /** 执行导入 */
  const handleImport = useCallback(async () => {
    if (!jsonContent) return;
    setImporting(true);
    try {
      const res = await importConnections(jsonContent, conflictStrategy);
      setResult(
        t("connection.importSuccess", {
          imported: res.imported,
          skipped: res.skipped,
          overwritten: res.overwritten,
        }),
      );
      // 刷新连接列表
      const updated = await listConnections();
      setConnections(updated);
    } catch (err) {
      setResult(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  }, [jsonContent, conflictStrategy, t, setConnections]);

  /** 关闭时重置状态 */
  const handleClose = () => {
    setJsonContent(null);
    setFileName("");
    setPreviewCount(0);
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("connection.importConnections")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2 items-center">
            <Button variant="outline" onClick={handleSelectFile}>
              <Upload size={16} />
              {t("dataImport.selectFile")}
            </Button>
            {fileName && (
              <span className="text-sm text-muted-foreground">
                {fileName} — {previewCount} {t("dataImport.keys")}
              </span>
            )}
          </div>

          {jsonContent && (
            <div className="space-y-2">
              <Label>{t("connection.conflictStrategy")}</Label>
              <Select
                value={conflictStrategy}
                onValueChange={(val) =>
                  setConflictStrategy(val as typeof conflictStrategy)
                }
              >
                <SelectTrigger>
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
          )}

          {result && (
            <div className="text-sm px-3 py-2 rounded-lg bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              {result}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={handleClose}>
            {t("actions.close")}
          </Button>
          <Button
            onClick={handleImport}
            disabled={importing || !jsonContent || !!result}
          >
            {importing && <Loader2 className="animate-spin" size={14} />}
            {t("actions.import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
