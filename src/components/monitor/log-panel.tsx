"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useRef, useEffect } from "react";
import type { LogEntry } from "@/stores/monitor-store";
import { Play, Square, Trash2 } from "lucide-react";

/** 日志面板 — 展示 Redis MONITOR 实时命令流 */
export function LogPanel({
  entries,
  monitoring,
  onStart,
  onStop,
  onClear,
}: {
  entries: LogEntry[];
  monitoring: boolean;
  onStart: () => void;
  onStop: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 mb-3">
        {monitoring ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={onStop}
            className="flex items-center gap-1.5"
          >
            <Square className="w-3.5 h-3.5" />
            {t("monitor.stopLog")}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            onClick={onStart}
            className="flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" />
            {t("monitor.startLog")}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          disabled={entries.length === 0}
          className="flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {t("monitor.clearLog")}
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {t("monitor.logCount", { count: entries.length })}
        </span>
      </div>

      {/* 日志列表 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto font-mono text-xs bg-muted rounded-lg p-3 space-y-1"
      >
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {monitoring
              ? t("monitor.waitingLog")
              : t("monitor.noLog")}
          </div>
        ) : (
          entries.map((entry, idx) => (
            <div key={idx} className="break-all">
              <span className="text-muted-foreground">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>{" "}
              <span className="text-foreground">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
