"use client";

import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { Virtuoso } from "react-virtuoso";
import type { PubSubMessage } from "@/lib/tauri-api";

/** 消息实时列表 — 虚拟滚动展示 Pub/Sub 消息 */
export function MessageList({
  messages,
  filterKeyword,
}: {
  messages: PubSubMessage[];
  filterKeyword: string;
}) {
  const { t } = useTranslation();

  /** 按关键词过滤消息 */
  const filtered = useMemo(() => {
    if (!filterKeyword) return messages;
    const kw = filterKeyword.toLowerCase();
    return messages.filter(
      (m) =>
        m.channel.toLowerCase().includes(kw) ||
        m.message.toLowerCase().includes(kw)
    );
  }, [messages, filterKeyword]);

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-default-400 text-sm">
        {t("pubsub.noMessages")}
      </div>
    );
  }

  return (
    <Virtuoso
      data={filtered}
      followOutput="smooth"
      itemContent={(_, msg) => (
        <div className="flex items-start gap-3 px-3 py-1.5 border-b border-divider/50 text-xs hover:bg-default-100">
          <span className="text-default-400 shrink-0 w-20 font-mono">
            {new Date(msg.timestamp).toLocaleTimeString()}
          </span>
          <span className="text-primary shrink-0 font-mono truncate max-w-40">
            {msg.channel}
          </span>
          <span className="text-foreground break-all">{msg.message}</span>
        </div>
      )}
    />
  );
}
