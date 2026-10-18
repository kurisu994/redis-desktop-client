"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getBackendCapabilities } from "@/lib/tauri-api";

const FALLBACK_KEYS = {
  sentinel: "capability.sentinel.degraded",
  cluster: "capability.cluster.unsupported",
} as const;

/**
 * 按后端能力标志展示 Sentinel / Cluster 的降级或不可用说明。
 * 文案 key 来自 `get_backend_capabilities`，避免 UI 和真实连接行为各写一套。
 */
export function CapabilityNotice({ mode }: { mode: "sentinel" | "cluster" }) {
  const { t } = useTranslation();
  const [detailKey, setDetailKey] = useState<string | null>(
    FALLBACK_KEYS[mode],
  );

  useEffect(() => {
    let cancelled = false;
    getBackendCapabilities()
      .then((caps) => {
        if (cancelled) return;
        const flag = mode === "cluster" ? caps.cluster : caps.sentinel;
        if (flag.status === "supported") {
          setDetailKey(null);
          return;
        }
        setDetailKey(flag.detailKey || FALLBACK_KEYS[mode]);
      })
      .catch(() => {
        if (!cancelled) setDetailKey(FALLBACK_KEYS[mode]);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  if (!detailKey) return null;
  return <p className="text-xs text-muted-foreground">{t(detailKey)}</p>;
}
