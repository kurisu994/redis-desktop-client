"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { sshTofuDecide, type SshTofuRequest } from "@/lib/tauri-api";

export interface UseSshTofuListenerReturn {
  /** 当前需要用户确认的 TOFU 请求 */
  currentRequest: SshTofuRequest | null;
  /** 用户选择信任 */
  accept: () => Promise<void>;
  /** 用户选择拒绝 */
  reject: () => Promise<void>;
  /** 关闭弹窗并按拒绝处理 */
  dismiss: () => void;
}

/**
 * 监听后端 `ssh:tofu-request` 事件，管理 TOFU 确认请求队列
 *
 * 多跳链路首次连接可能连续触发多次请求，这里用队列依次展示，
 * 用户处理完一个后才显示下一个。
 */
export function useSshTofuListener(): UseSshTofuListenerReturn {
  const [queue, setQueue] = useState<SshTofuRequest[]>([]);
  const queueRef = useRef(queue);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const currentRequest = queue[0] ?? null;

  const processNext = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const accept = useCallback(async () => {
    const req = queueRef.current[0];
    if (!req) return;
    try {
      await sshTofuDecide(req.connection_id, req.hop_index, true);
    } catch (err) {
      console.error("信任 SSH 主机失败:", err);
    } finally {
      processNext();
    }
  }, [processNext]);

  const reject = useCallback(async () => {
    const req = queueRef.current[0];
    if (!req) return;
    try {
      await sshTofuDecide(req.connection_id, req.hop_index, false);
    } catch (err) {
      console.error("拒绝 SSH 主机失败:", err);
    } finally {
      processNext();
    }
  }, [processNext]);

  const dismiss = useCallback(() => {
    const req = queueRef.current[0];
    if (req) {
      // 关闭弹窗视为拒绝，向后端发送拒绝决策
      sshTofuDecide(req.connection_id, req.hop_index, false).catch(() => {});
    }
    processNext();
  }, [processNext]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let active = true;

    const setup = async () => {
      const fn = await listen<SshTofuRequest>("ssh:tofu-request", (event) => {
        if (!active) return;
        setQueue((prev) => [...prev, event.payload]);
      });
      if (active) {
        unlisten = fn;
      } else {
        fn();
      }
    };

    setup();

    return () => {
      active = false;
      if (unlisten) unlisten();
    };
  }, []);

  return { currentRequest, accept, reject, dismiss };
}
