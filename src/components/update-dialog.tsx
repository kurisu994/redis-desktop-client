"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  downloadAndInstallUpdate,
  relaunchApp,
} from "@/lib/tauri-api";
import type { UpdateInfo, DownloadEvent } from "@/lib/tauri-api";
import { ArrowDownToLine, RefreshCw, Sparkles } from "lucide-react";

/** 更新状态 */
type UpdateState = "idle" | "downloading" | "downloaded" | "error";

interface UpdateDialogProps {
  /** 可用的更新信息，null 时弹窗关闭 */
  updateInfo: UpdateInfo | null;
  /** 关闭弹窗回调 */
  onDismiss: () => void;
}

/**
 * 更新提示弹窗 — 发现新版本时弹出
 * 通过 key={updateInfo?.version} 让 React 在新版本到来时自动重建内部组件，
 * 省去手动重置状态的逻辑
 */
export function UpdateDialog({ updateInfo, onDismiss }: UpdateDialogProps) {
  if (!updateInfo) return null;

  return (
    <UpdateDialogInner
      key={updateInfo.version}
      updateInfo={updateInfo}
      onDismiss={onDismiss}
    />
  );
}

/** 内部实现组件 — 每次 key 变化自动重置所有 state */
function UpdateDialogInner({
  updateInfo,
  onDismiss,
}: {
  updateInfo: UpdateInfo;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<UpdateState>("idle");
  const [progress, setProgress] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [downloadedSize, setDownloadedSize] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /** 下载进度回调 */
  const handleProgress = useCallback((event: DownloadEvent) => {
    switch (event.event) {
      case "Started":
        setTotalSize(event.data.contentLength ?? 0);
        setDownloadedSize(0);
        break;
      case "Progress":
        setDownloadedSize((prev) => {
          const next = prev + event.data.chunkLength;
          setTotalSize((total) => {
            if (total > 0) {
              setProgress(Math.min(100, Math.round((next / total) * 100)));
            }
            return total;
          });
          return next;
        });
        break;
      case "Finished":
        setProgress(100);
        setState("downloaded");
        break;
    }
  }, []);

  /** 开始下载并安装 */
  const handleDownload = useCallback(async () => {
    setState("downloading");
    setError(null);
    try {
      await downloadAndInstallUpdate(handleProgress);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [handleProgress]);

  /** 重启应用 */
  const handleRelaunch = useCallback(async () => {
    await relaunchApp();
  }, []);

  /** 格式化文件大小 */
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            {t("update.newVersion")}
          </DialogTitle>
          <DialogDescription>
            {t("settings.updateAvailable", { version: updateInfo.version })}
          </DialogDescription>
        </DialogHeader>

        {/* 更新说明 */}
        {updateInfo.body && (
          <div className="max-h-48 overflow-y-auto rounded-md border bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t("update.releaseNotes")}
            </p>
            <div className="text-sm whitespace-pre-wrap leading-relaxed">
              {updateInfo.body}
            </div>
          </div>
        )}

        {/* 下载进度条 */}
        {state === "downloading" && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t("settings.downloading")} {progress}%</span>
              {totalSize > 0 && (
                <span>
                  {formatSize(downloadedSize)} / {formatSize(totalSize)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {state === "error" && error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          {state === "idle" && (
            <>
              <Button variant="outline" onClick={onDismiss}>
                {t("update.later")}
              </Button>
              <Button onClick={handleDownload}>
                <ArrowDownToLine size={16} className="mr-1" />
                {t("update.downloadInstall")}
              </Button>
            </>
          )}

          {state === "downloading" && (
            <Button variant="outline" disabled>
              <RefreshCw size={16} className="mr-1 animate-spin" />
              {t("settings.downloading")}
            </Button>
          )}

          {state === "downloaded" && (
            <Button onClick={handleRelaunch}>
              <RefreshCw size={16} className="mr-1" />
              {t("update.restartNow")}
            </Button>
          )}

          {state === "error" && (
            <>
              <Button variant="outline" onClick={onDismiss}>
                {t("actions.close")}
              </Button>
              <Button onClick={handleDownload}>
                {t("update.retry")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

