"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X } from "lucide-react";
import { usePubSubStore } from "@/stores/pubsub-store";
import { useConnectionStore } from "@/stores/connection-store";
import type { PubSubMessage } from "@/lib/tauri-api";
import { subscribeChannels, publishMessage } from "@/lib/tauri-api";
import { MessageList } from "./message-list";

/** Pub/Sub 主页面 */
export function PubSubPage() {
  const { t } = useTranslation();
  const { activeConnectionId } = useConnectionStore();
  const {
    subscribedChannels,
    messages,
    paused,
    filterKeyword,
    addChannel,
    removeChannel,
    clearMessages,
    setPaused,
    setFilterKeyword,
    resetPubSub,
  } = usePubSubStore();

  const [channelInput, setChannelInput] = useState("");
  const [publishChannel, setPublishChannel] = useState("");
  const [publishContent, setPublishContent] = useState("");

  // 连接变化时重置
  useEffect(() => {
    resetPubSub();
  }, [activeConnectionId, resetPubSub]);

  // 注册 Tauri Event 监听（仅 Tauri 环境）
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
        const { listen } = await import("@tauri-apps/api/event");
        unlisten = await listen<PubSubMessage>("redis://pubsub", (event) => {
          if (!usePubSubStore.getState().paused) {
            usePubSubStore.getState().addMessage(event.payload);
          }
        });
      }
    };
    setup();

    return () => {
      unlisten?.();
    };
  }, []);

  /** 订阅频道 */
  const handleSubscribe = useCallback(async () => {
    if (!channelInput.trim() || !activeConnectionId) return;
    try {
      await subscribeChannels(activeConnectionId, [channelInput.trim()]);
      addChannel(channelInput.trim());
      setChannelInput("");
      toast.success(
        t("pubsub.subscribeSuccess", { channel: channelInput.trim() }),
      );
    } catch (err) {
      toast.error(String(err));
    }
  }, [channelInput, activeConnectionId, addChannel, t]);

  /** 发布消息 */
  const handlePublish = useCallback(async () => {
    if (!publishChannel.trim() || !publishContent.trim() || !activeConnectionId)
      return;
    try {
      const result = await publishMessage(
        activeConnectionId,
        publishChannel.trim(),
        publishContent.trim(),
      );
      toast.success(
        t("pubsub.publishSuccess", { receivers: result.receivers }),
      );
      setPublishContent("");
    } catch (err) {
      toast.error(String(err));
    }
  }, [publishChannel, publishContent, activeConnectionId, t]);

  return (
    <div className="flex flex-col h-full p-4 gap-3 overflow-hidden">
      {/* 订阅管理 */}
      <div className="flex items-center gap-2">
        <Input
          placeholder={t("pubsub.channelPlaceholder")}
          value={channelInput}
          onChange={(e) => setChannelInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
          className="max-w-xs h-8"
        />
        <Button size="sm" onClick={handleSubscribe}>
          {t("pubsub.subscribe")}
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="secondary"
          className={
            paused
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-yellow-600 hover:bg-yellow-700 text-white"
          }
          onClick={() => setPaused(!paused)}
        >
          {paused ? t("monitor.resume") : t("monitor.pause")}
        </Button>
        <Button size="sm" variant="secondary" onClick={clearMessages}>
          {t("pubsub.clearMessages")}
        </Button>
      </div>

      {/* 已订阅频道标签 */}
      {subscribedChannels.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-muted-foreground mr-1">
            {t("pubsub.subscribedChannels")}:
          </span>
          {subscribedChannels.map((ch) => (
            <Badge key={ch} variant="secondary" className="gap-1 pr-1">
              {ch}
              <button
                onClick={() => removeChannel(ch)}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* 发布消息 */}
      <div className="flex items-center gap-2">
        <Input
          placeholder={t("pubsub.publishChannelPlaceholder")}
          value={publishChannel}
          onChange={(e) => setPublishChannel(e.target.value)}
          className="max-w-xs h-8"
        />
        <Input
          placeholder={t("pubsub.messagePlaceholder")}
          value={publishContent}
          onChange={(e) => setPublishContent(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handlePublish()}
          className="flex-1 h-8"
        />
        <Button size="sm" variant="secondary" onClick={handlePublish}>
          {t("pubsub.publish")}
        </Button>
      </div>

      {/* 过滤 */}
      <Input
        placeholder={t("pubsub.filterPlaceholder")}
        value={filterKeyword}
        onChange={(e) => setFilterKeyword(e.target.value)}
        className="max-w-md h-8"
      />

      {/* 消息列表 */}
      <div className="flex-1 overflow-hidden border border-border rounded-lg">
        <MessageList messages={messages} filterKeyword={filterKeyword} />
      </div>
    </div>
  );
}
