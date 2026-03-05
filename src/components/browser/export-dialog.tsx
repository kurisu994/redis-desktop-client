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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
          toast.success(t("dataExport.exportSuccess"));
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
        toast.success(t("dataExport.exportSuccess"));
        onClose();
      }
    } catch (err) {
      toast.error(String(err));
    } finally {
      setExporting(false);
    }
  }, [activeConnectionId, selectedDb, matchingKeys, onClose, t]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("dataExport.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t("dataExport.pattern")}</Label>
            <Input
              className="h-8 text-sm"
              placeholder="*"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("dataExport.matchCount", { count: matchingKeys.length })}
          </p>
          {exporting && <Progress value={undefined} className="h-1" />}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {t("actions.cancel")}
          </Button>
          <Button
            onClick={handleExport}
            disabled={exporting || matchingKeys.length === 0}
          >
            {exporting && <Loader2 className="animate-spin" size={14} />}
            {t("actions.export")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
