"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMonitorStore, type MonitorTab } from "@/stores/monitor-store";
import { useConnectionStore } from "@/stores/connection-store";
import { getServerInfo, getSlowLog, resetSlowLog } from "@/lib/tauri-api";
import { InfoCards, ServerInfoPanel } from "./server-info";
import { RealtimeCharts } from "./realtime-charts";
import { SlowLog } from "./slow-log";

/** 刷新间隔选项 (ms) */
const INTERVAL_OPTIONS = [
  { label: "1s", value: "1000" },
  { label: "2s", value: "2000" },
  { label: "5s", value: "5000" },
  { label: "10s", value: "10000" },
];

/** 监控主页面 — 整合服务器信息、实时图表、慢查询 */
export function MonitorPage() {
  const { t } = useTranslation();
  const { activeConnectionId } = useConnectionStore();
  const {
    activeTab,
    setActiveTab,
    serverInfo,
    setServerInfo,
    slowLog,
    setSlowLog,
    snapshots,
    addSnapshot,
    refreshInterval,
    setRefreshInterval,
    paused,
    setPaused,
    loading,
    setLoading,
    resetMonitor,
  } = useMonitorStore();

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 加载服务器信息 */
  const fetchServerInfo = useCallback(async () => {
    if (!activeConnectionId) return;
    try {
      setLoading(true);
      const info = await getServerInfo(activeConnectionId);
      setServerInfo(info);

      // 提取监控指标用于实时图表
      const stats = info.stats || {};
      const memory = info.memory || {};
      const clients = info.clients || {};

      const hits = parseInt(stats.keyspace_hits || "0", 10);
      const misses = parseInt(stats.keyspace_misses || "0", 10);
      const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;

      addSnapshot({
        timestamp: Date.now(),
        ops_per_sec: parseInt(stats.instantaneous_ops_per_sec || "0", 10),
        used_memory: parseInt(memory.used_memory || "0", 10),
        connected_clients: parseInt(clients.connected_clients || "0", 10),
        hit_rate: hitRate,
      });
    } catch (err) {
      console.error("获取服务器信息失败:", err);
    } finally {
      setLoading(false);
    }
  }, [activeConnectionId, setServerInfo, addSnapshot, setLoading]);

  /** 加载慢查询 */
  const fetchSlowLog = useCallback(async () => {
    if (!activeConnectionId) return;
    try {
      const entries = await getSlowLog(activeConnectionId);
      setSlowLog(entries);
    } catch (err) {
      console.error("获取慢查询日志失败:", err);
    }
  }, [activeConnectionId, setSlowLog]);

  /** 清空慢查询 */
  const handleResetSlowLog = useCallback(async () => {
    if (!activeConnectionId) return;
    try {
      await resetSlowLog(activeConnectionId);
      setSlowLog([]);
    } catch (err) {
      console.error("清空慢查询失败:", err);
    }
  }, [activeConnectionId, setSlowLog]);

  // 连接变化时重置
  useEffect(() => {
    resetMonitor();
  }, [activeConnectionId, resetMonitor]);

  // 初始加载
  useEffect(() => {
    fetchServerInfo();
    fetchSlowLog();
  }, [fetchServerInfo, fetchSlowLog]);

  // 定时刷新
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (!paused && refreshInterval > 0) {
      timerRef.current = setInterval(fetchServerInfo, refreshInterval);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, refreshInterval, fetchServerInfo]);

  return (
    <div className="flex flex-col h-full p-4 gap-3 overflow-hidden">
      {/* 指标卡片 */}
      {serverInfo && <InfoCards info={serverInfo} />}

      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as MonitorTab)}
        >
          <TabsList>
            <TabsTrigger value="info">{t("monitor.serverInfo")}</TabsTrigger>
            <TabsTrigger value="realtime">{t("monitor.realtime")}</TabsTrigger>
            <TabsTrigger value="slowlog">{t("monitor.slowLog")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Select
            value={String(refreshInterval)}
            onValueChange={(val) => setRefreshInterval(parseInt(val, 10))}
          >
            <SelectTrigger className="w-20 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERVAL_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="secondary"
            className={paused ? "bg-green-600 hover:bg-green-700 text-white" : "bg-yellow-600 hover:bg-yellow-700 text-white"}
            onClick={() => setPaused(!paused)}
          >
            {paused ? t("monitor.resume") : t("monitor.pause")}
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "info" && serverInfo && (
          <ServerInfoPanel info={serverInfo} />
        )}
        {activeTab === "info" && !serverInfo && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {loading ? t("monitor.loading") : t("monitor.noData")}
          </div>
        )}
        {activeTab === "realtime" && <RealtimeCharts snapshots={snapshots} />}
        {activeTab === "slowlog" && (
          <SlowLog
            entries={slowLog}
            onRefresh={fetchSlowLog}
            onReset={handleResetSlowLog}
          />
        )}
      </div>
    </div>
  );
}
