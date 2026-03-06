"use client";

import { useCallback, useState } from "react";
import { type ConnectionConfig, useConnectionStore } from "@/stores/connection-store";
import { reorderConnections } from "@/lib/tauri-api";

/** 拖拽相关 props */
export interface DragProps {
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  isDragOver: boolean;
  dragOverPosition: "above" | "below" | null;
}

/** 执行排序并持久化 */
async function applyReorder(
  connections: ConnectionConfig[],
  dragId: string,
  buildList: (list: ConnectionConfig[], fromIdx: number) => void,
  setConnections: (list: ConnectionConfig[]) => void,
  handleDragEnd: () => void,
) {
  const list = [...connections];
  const fromIdx = list.findIndex((c) => c.id === dragId);
  if (fromIdx < 0) {
    handleDragEnd();
    return;
  }
  buildList(list, fromIdx);
  setConnections(list);
  handleDragEnd();
  await reorderConnections(list.map((c) => c.id)).catch(console.error);
}

/** 连接列表拖拽排序 hook */
export function useConnectionDrag() {
  const { connections, setConnections } = useConnectionStore();
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverPos, setDragOverPos] = useState<"above" | "below" | null>(null);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDragOverId(null);
    setDragOverPos(null);
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }, []);

  /** 拖拽经过 — 上半 = above，下半 = below */
  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOverId(id);
    setDragOverPos(e.clientY < rect.top + rect.height / 2 ? "above" : "below");
  }, []);

  /** 放下到具体连接项上 */
  const handleDrop = useCallback(
    async (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      if (!dragId || dragId === targetId) {
        handleDragEnd();
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const position = e.clientY < rect.top + rect.height / 2 ? "above" : "below";

      await applyReorder(connections, dragId, (list, fromIdx) => {
        const toIdx = list.findIndex((c) => c.id === targetId);
        if (toIdx < 0) return;
        const [moved] = list.splice(fromIdx, 1);
        const insertIdx = position === "above" ? toIdx : toIdx + 1;
        const adjustedIdx = fromIdx < toIdx ? insertIdx - 1 : insertIdx;
        list.splice(adjustedIdx, 0, moved);
      }, setConnections, handleDragEnd);
    },
    [dragId, connections, setConnections, handleDragEnd],
  );

  /** 容器下方空白区域 — 移到末尾 */
  const handleContainerDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!dragId || connections.length === 0) return;
      if ((e.target as HTMLElement) !== e.currentTarget) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const last = connections[connections.length - 1];
      if (last.id !== dragId) {
        setDragOverId(last.id);
        setDragOverPos("below");
      }
    },
    [dragId, connections],
  );

  const handleContainerDrop = useCallback(
    async (e: React.DragEvent) => {
      if ((e.target as HTMLElement) !== e.currentTarget) return;
      e.preventDefault();
      if (!dragId) { handleDragEnd(); return; }
      await applyReorder(connections, dragId, (list, fromIdx) => {
        const [moved] = list.splice(fromIdx, 1);
        list.push(moved);
      }, setConnections, handleDragEnd);
    },
    [dragId, connections, setConnections, handleDragEnd],
  );

  /** 上方区域（新建按钮）— 移到首部 */
  const handleTopDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!dragId || connections.length === 0) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const first = connections[0];
      if (first.id !== dragId) {
        setDragOverId(first.id);
        setDragOverPos("above");
      }
    },
    [dragId, connections],
  );

  const handleTopDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      if (!dragId) { handleDragEnd(); return; }
      await applyReorder(connections, dragId, (list, fromIdx) => {
        if (fromIdx === 0) return;
        const [moved] = list.splice(fromIdx, 1);
        list.unshift(moved);
      }, setConnections, handleDragEnd);
    },
    [dragId, connections, setConnections, handleDragEnd],
  );

  /** 为单个连接生成拖拽 props */
  const getDragProps = useCallback(
    (connId: string): DragProps => ({
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDragEnd: handleDragEnd,
      onDrop: handleDrop,
      isDragOver: dragOverId === connId && dragId !== connId,
      dragOverPosition: dragOverId === connId && dragId !== connId ? dragOverPos : null,
    }),
    [handleDragStart, handleDragOver, handleDragEnd, handleDrop, dragOverId, dragId, dragOverPos],
  );

  return {
    getDragProps,
    handleContainerDragOver,
    handleContainerDrop,
    handleTopDragOver,
    handleTopDrop,
  };
}
