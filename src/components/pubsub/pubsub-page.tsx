"use client";

import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useState } from "react";
import { Button, Chip, Input } from "@heroui/react";
import { addToast } from "@heroui/toast";
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
    addMessage,
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
      if (
        typeof window !== "undefined" &&
        "__TAURI_INTERNALS__" in window
      ) {
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
      addToast({
        title: t("pubsub.subscribeSuccess", { channel: channelInput.trim() }),
        color: "success",
      });
    } catch (err) {
      addToast({ title: String(err), color: "danger" });
    }
  }, [channelInput, activeConnectionId, addChannel, t]);

  /** 发布消息 */
  const handlePublish = useCallback(async () => {
    if (!publishChannel.trim() || !publishContent.trim() || !activeConnectionId) return;
    try {
      const result = await publishMessage(
        activeConnectionId,
        publishChannel.trim(),
        publishContent.trim()
      );
      addToast({
        title: t("pubsub.publishSuccess", { receivers: result.receivers }),
        color: "success",
      });
      setPublishContent("");
    } catch (err) {
      addToast({ title: String(err), color: "danger" });
    }
  }, [publishChannel, publishContent, activeConnectionId, t]);

  return (
    <div className="flex flex-col h-full p-4 gap-3 overflow-hidden">
      {/* 订阅管理 */}
      <div className="flex items-center gap-2">
        <Input
          size="sm"
          placeholder={t("pubsub.channelPlaceholder")}
          value={channelInput}
          onValueChange={setChannelInput}
          onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
          className="max-w-xs"
        />
        <Button size="sm" color="primary" onPress={handleSubscribe}>
          {t("pubsub.subscribe")}
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="flat"
          color={paused ? "success" : "warning"}
          onPress={() => setPaused(!paused)}
        >
          {paused ? t("monitor.resume") : t("monitor.pause")}
        </Button>
        <Button
          size="sm"
          variant="flat"
          onPress={clearMessages}
        >
          {t("pubsub.clearMessages")}
        </Button>
      </div>

      {/* 已订阅频道标签 */}
      {subscribedChannels.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-default-500 mr-1">
            {t("pubsub.subscribedChannels")}:
          </span>
          {subscribedChannels.map((ch) => (
            <Chip
              key={ch}
              size="sm"
              variant="flat"
              color="primary"
              onClose={() => removeChannel(ch)}
            >
              {ch}
            </Chip>
          ))}
        </div>
      )}

      {/* 发布消息 */}
      <div className="flex items-center gap-2">
        <Input
          size="sm"
          placeholder={t("pubsub.publishChannelPlaceholder")}
          value={publishChannel}
          onValueChange={setPublishChannel}
          className="max-w-xs"
        />
        <Input
          size="sm"
          placeholder={t("pubsub.messagePlaceholder")}
          value={publishContent}
          onValueChange={setPublishContent}
          onKeyDown={(e) => e.key === "Enter" && handlePublish()}
          className="flex-1"
        />
        <Button size="sm" color="secondary" onPress={handlePublish}>
          {t("pubsub.publish")}
        </Button>
      </div>

      {/* 过滤 */}
      <Input
        size="sm"
        placeholder={t("pubsub.filterPlaceholder")}
        value={filterKeyword}
        onValueChange={setFilterKeyword}
        className="max-w-md"
      />

      {/* 消息列表 */}
      <div className="flex-1 overflow-hidden border border-divider rounded-lg">
        <MessageList messages={messages} filterKeyword={filterKeyword} />
      </div>
    </div>
  );
}
