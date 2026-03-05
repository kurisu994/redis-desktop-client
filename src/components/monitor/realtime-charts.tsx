"use client";

import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { MonitorSnapshot } from "@/stores/monitor-store";

/** 实时监控图表 — 展示 ops/sec、内存、连接数、命中率 */
export function RealtimeCharts({
  snapshots,
}: {
  snapshots: MonitorSnapshot[];
}) {
  const { t } = useTranslation();

  /** 格式化图表数据 */
  const chartData = useMemo(
    () =>
      snapshots.map((s) => ({
        time: new Date(s.timestamp).toLocaleTimeString(),
        ops: s.ops_per_sec,
        memory: Math.round(s.used_memory / 1024 / 1024 * 100) / 100,
        clients: s.connected_clients,
        hitRate: Math.round(s.hit_rate * 100) / 100,
      })),
    [snapshots]
  );

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        {t("monitor.waitingData")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 h-full">
      {/* ops/sec 图表 */}
      <div className="bg-muted rounded-lg p-3">
        <h4 className="text-xs font-semibold text-primary mb-2">
          {t("monitor.opsPerSec")}
        </h4>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="ops"
              stroke="#006FEE"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 内存 (MB) 图表 */}
      <div className="bg-muted rounded-lg p-3">
        <h4 className="text-xs font-semibold text-warning mb-2">
          {t("monitor.memoryMB")}
        </h4>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="memory"
              stroke="#F5A524"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 连接数图表 */}
      <div className="bg-muted rounded-lg p-3">
        <h4 className="text-xs font-semibold text-secondary mb-2">
          {t("monitor.connectedClients")}
        </h4>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="clients"
              stroke="#9353D3"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 命中率 (%) 图表 */}
      <div className="bg-muted rounded-lg p-3">
        <h4 className="text-xs font-semibold text-green-500 mb-2">
          {t("monitor.hitRate")}
        </h4>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="time" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="hitRate"
              stroke="#17C964"
              strokeWidth={2}
              dot={false}
              name="%"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
