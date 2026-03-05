"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { SlowLogEntry } from "@/lib/tauri-api";

/** 慢查询日志列表 */
export function SlowLog({
  entries,
  onRefresh,
  onReset,
}: {
  entries: SlowLogEntry[];
  onRefresh: () => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 mb-3">
        <Button size="sm" variant="secondary" onClick={onRefresh}>
          {t("actions.refresh")}
        </Button>
        <Button size="sm" variant="destructive" onClick={onReset}>
          {t("monitor.resetSlowLog")}
        </Button>
      </div>

      {/* 表格 */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {t("monitor.noSlowLog")}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-2 w-16">ID</th>
                <th className="text-left p-2 w-32">{t("monitor.timestamp")}</th>
                <th className="text-right p-2 w-24">{t("monitor.duration")}</th>
                <th className="text-left p-2">{t("monitor.command")}</th>
                <th className="text-left p-2 w-36">{t("monitor.clientAddr")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-border/50 hover:bg-accent"
                >
                  <td className="p-2 text-muted-foreground">{entry.id}</td>
                  <td className="p-2">
                    {new Date(entry.timestamp * 1000).toLocaleString()}
                  </td>
                  <td className="p-2 text-right font-mono text-yellow-500">
                    {entry.duration_us.toLocaleString()}μs
                  </td>
                  <td className="p-2 font-mono truncate max-w-md">
                    {entry.command}
                  </td>
                  <td className="p-2 text-muted-foreground">{entry.client_addr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
