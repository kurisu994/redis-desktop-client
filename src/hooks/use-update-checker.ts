"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { checkUpdate } from "@/lib/tauri-api";
import type { UpdateInfo } from "@/lib/tauri-api";

/** 默认检查间隔：24 小时（毫秒） */
const DEFAULT_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** 启动后延迟检查时间：5 秒 */
const STARTUP_DELAY_MS = 5000;

/** localStorage key */
const STORAGE_KEY_AUTO_UPDATE = "auto-update-enabled";
const STORAGE_KEY_LAST_CHECK = "last-update-check";

/** 从 localStorage 读取自动更新开关 */
function getAutoUpdateEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_KEY_AUTO_UPDATE);
  return stored === null ? true : stored === "true";
}

/** 持久化自动更新开关 */
function setAutoUpdateEnabled(enabled: boolean): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_AUTO_UPDATE, String(enabled));
  }
}

/** 获取上次检查时间戳 */
function getLastCheckTime(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(STORAGE_KEY_LAST_CHECK) || "0", 10);
}

/** 记录检查时间戳 */
function setLastCheckTime(ts: number): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY_LAST_CHECK, String(ts));
  }
}

/** 更新检查 hook 返回值 */
export interface UseUpdateCheckerReturn {
  /** 是否有可用更新 */
  updateAvailable: UpdateInfo | null;
  /** 是否正在检查 */
  checking: boolean;
  /** 自动检查开关 */
  autoUpdateEnabled: boolean;
  /** 切换自动检查开关 */
  setAutoUpdate: (enabled: boolean) => void;
  /** 手动触发检查 */
  manualCheck: () => Promise<void>;
  /** 关闭更新弹窗 */
  dismissUpdate: () => void;
}

/**
 * 应用更新检查 hook
 * - 启动后延迟 5 秒自动检查（如果距上次检查已超过 24 小时）
 * - 支持手动触发检查
 * - 支持开关自动检查
 */
export function useUpdateChecker(): UseUpdateCheckerReturn {
  const [updateAvailable, setUpdateAvailable] = useState<UpdateInfo | null>(
    null,
  );
  const [checking, setChecking] = useState(false);
  const [autoUpdateEnabled, setAutoUpdateEnabledState] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 初始化读取 localStorage 中的开关状态 */
  useEffect(() => {
    setAutoUpdateEnabledState(getAutoUpdateEnabled());
  }, []);

  /** 执行检查更新 */
  const doCheck = useCallback(async () => {
    setChecking(true);
    try {
      const info = await checkUpdate();
      if (info) {
        setUpdateAvailable(info);
      }
      setLastCheckTime(Date.now());
    } catch (err) {
      console.warn("[更新检查] 检查失败:", err);
    } finally {
      setChecking(false);
    }
  }, []);

  /** 启动时自动检查 */
  useEffect(() => {
    if (!autoUpdateEnabled) return;

    const lastCheck = getLastCheckTime();
    const elapsed = Date.now() - lastCheck;

    // 距上次检查超过间隔才自动检查
    if (elapsed < DEFAULT_CHECK_INTERVAL_MS) return;

    timerRef.current = setTimeout(() => {
      doCheck();
    }, STARTUP_DELAY_MS);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [autoUpdateEnabled, doCheck]);

  /** 手动检查 */
  const manualCheck = useCallback(async () => {
    setUpdateAvailable(null);
    await doCheck();
  }, [doCheck]);

  /** 切换自动检查开关 */
  const setAutoUpdate = useCallback((enabled: boolean) => {
    setAutoUpdateEnabledState(enabled);
    setAutoUpdateEnabled(enabled);
  }, []);

  /** 关闭更新弹窗 */
  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(null);
  }, []);

  return {
    updateAvailable,
    checking,
    autoUpdateEnabled,
    setAutoUpdate,
    manualCheck,
    dismissUpdate,
  };
}
