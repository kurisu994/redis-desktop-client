"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { ShieldCheck, ShieldX } from "lucide-react";
import type { SshTofuRequest } from "@/lib/tauri-api";

interface SshTofuDialogProps {
  request: SshTofuRequest | null;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
  onDismiss: () => void;
}

/**
 * SSH 首次连接 Trust on First Use 确认弹窗
 *
 * 显示服务器 host:port 与 OpenSSH 风格的 SHA256 指纹，
 * 用户选择「信任并保存」后写入 known_hosts；选择「拒绝」则连接失败。
 */
export function SshTofuDialog({
  request,
  onAccept,
  onReject,
  onDismiss,
}: SshTofuDialogProps) {
  const { t } = useTranslation();
  const isOpen = request !== null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" />
            <span>{t("connection.sshHostKeyTitle")}</span>
          </DialogTitle>
          <DialogDescription>
            {t("connection.sshHostKeyDescription", {
              host: request?.host ?? "",
              port: request?.port ?? 0,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-muted p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {t("connection.sshHostKeyFingerprint")}
            </p>
            <code className="block break-all text-sm font-mono text-foreground">
              {request?.fingerprint ?? ""}
            </code>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("connection.sshHostKeyHint")}
          </p>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onReject}>
            <ShieldX size={14} className="mr-1" />
            {t("connection.sshHostKeyReject")}
          </Button>
          <Button onClick={onAccept}>
            <ShieldCheck size={14} className="mr-1" />
            {t("connection.sshHostKeyTrust")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
