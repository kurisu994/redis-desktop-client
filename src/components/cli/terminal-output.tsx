"use client";

import { useEffect, useRef } from "react";
import type { OutputEntry } from "@/stores/cli-store";

/** 结果类型颜色映射 */
function getResultColor(resultType?: string): string {
  switch (resultType) {
    case "ok":
      return "text-success";
    case "error":
      return "text-danger";
    case "integer":
      return "text-primary";
    case "nil":
      return "text-default-400";
    case "bulk":
      return "text-warning";
    case "array":
      return "text-secondary";
    default:
      return "text-foreground";
  }
}

interface TerminalOutputProps {
  outputs: OutputEntry[];
}

/** 终端输出区域 — 展示命令和执行结果 */
export function TerminalOutput({ outputs }: TerminalOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [outputs]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto font-mono text-sm p-3 space-y-0.5"
    >
      {outputs.map((entry, i) => (
        <div key={i}>
          {entry.type === "command" ? (
            <div className="flex items-start gap-1.5">
              <span className="text-success shrink-0 select-none">&gt;</span>
              <span className="text-foreground">{entry.content}</span>
            </div>
          ) : entry.type === "error" ? (
            <div className="text-danger whitespace-pre-wrap pl-3">
              {entry.content}
            </div>
          ) : (
            <div className="pl-3">
              <span
                className={`whitespace-pre-wrap ${getResultColor(entry.resultType)}`}
              >
                {entry.content}
              </span>
              {entry.elapsedMs !== undefined && (
                <span className="text-default-400 text-xs ml-2">
                  ({entry.elapsedMs}ms)
                </span>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
