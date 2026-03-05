"use client";

import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ServerInfo } from "@/lib/tauri-api";

/** Badge 颜色映射 */
const colorMap = {
  primary: "",
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  secondary: "",
  danger: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
} as const;

/** 关键指标卡片组 — 展示 Redis 版本、运行时间、内存、连接数、Key 总数 */
export function InfoCards({ info }: { info: ServerInfo }) {
  const { t } = useTranslation();
  const server = info.server || {};
  const memory = info.memory || {};
  const clients = info.clients || {};
  const keyspace = info.keyspace || {};

  // 计算总 Key 数
  const totalKeys = Object.values(keyspace).reduce((sum, val) => {
    const match = val.match(/keys=(\d+)/);
    return sum + (match ? parseInt(match[1], 10) : 0);
  }, 0);

  // 运行时间格式化
  const uptimeDays = server.uptime_in_days || "0";
  const uptimeHours = Math.floor(
    (parseInt(server.uptime_in_seconds || "0", 10) % 86400) / 3600
  );

  const cards = [
    { label: t("monitor.version"), value: server.redis_version || "-", color: "primary" as const },
    { label: t("monitor.uptime"), value: `${uptimeDays}${t("monitor.days")} ${uptimeHours}${t("monitor.hours")}`, color: "success" as const },
    { label: t("monitor.usedMemory"), value: memory.used_memory_human || "-", color: "warning" as const },
    { label: t("monitor.clients"), value: clients.connected_clients || "0", color: "secondary" as const },
    { label: t("monitor.totalKeys"), value: totalKeys.toLocaleString(), color: "danger" as const },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {cards.map((card) => (
        <Card key={card.label} className="bg-muted">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <Badge variant="secondary" className={`mt-1 ${colorMap[card.color]}`}>
              {card.value}
            </Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** 服务器信息详情 — 按区块展示 INFO 数据 */
export function ServerInfoPanel({ info }: { info: ServerInfo }) {
  const { t } = useTranslation();

  // 展示顺序
  const sections = ["server", "clients", "memory", "stats", "replication", "keyspace"];
  const sectionLabels: Record<string, string> = {
    server: t("monitor.sectionServer"),
    clients: t("monitor.sectionClients"),
    memory: t("monitor.sectionMemory"),
    stats: t("monitor.sectionStats"),
    replication: t("monitor.sectionReplication"),
    keyspace: t("monitor.sectionKeyspace"),
  };

  return (
    <div className="grid grid-cols-2 gap-3 overflow-y-auto">
      {sections.map((section) => {
        const data = info[section];
        if (!data || Object.keys(data).length === 0) return null;
        return (
          <Card key={section} className="bg-muted">
            <CardContent className="p-3">
              <h4 className="text-xs font-semibold text-primary mb-2">
                {sectionLabels[section] || section}
              </h4>
              <div className="space-y-1">
                {Object.entries(data).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between text-xs gap-2"
                  >
                    <span className="text-muted-foreground truncate shrink-0">{key}</span>
                    <span className="text-foreground truncate text-right">{value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
