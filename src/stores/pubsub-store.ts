import { create } from "zustand";
import type { PubSubMessage } from "@/lib/tauri-api";

interface PubSubState {
  /** 已订阅的频道列表 */
  subscribedChannels: string[];
  /** 收到的消息列表 */
  messages: PubSubMessage[];
  /** 是否暂停显示新消息 */
  paused: boolean;
  /** 消息过滤关键词 */
  filterKeyword: string;
  /** 加载状态 */
  loading: boolean;

  addChannel: (channel: string) => void;
  removeChannel: (channel: string) => void;
  addMessage: (msg: PubSubMessage) => void;
  clearMessages: () => void;
  setPaused: (paused: boolean) => void;
  setFilterKeyword: (keyword: string) => void;
  setLoading: (loading: boolean) => void;
  resetPubSub: () => void;
}

/** 最大消息缓存数 */
const MAX_MESSAGES = 1000;

/** Pub/Sub Store */
export const usePubSubStore = create<PubSubState>((set) => ({
  subscribedChannels: [],
  messages: [],
  paused: false,
  filterKeyword: "",
  loading: false,

  addChannel: (channel) =>
    set((state) => ({
      subscribedChannels: state.subscribedChannels.includes(channel)
        ? state.subscribedChannels
        : [...state.subscribedChannels, channel],
    })),
  removeChannel: (channel) =>
    set((state) => ({
      subscribedChannels: state.subscribedChannels.filter((c) => c !== channel),
    })),
  addMessage: (msg) =>
    set((state) => ({
      messages: [...state.messages.slice(-(MAX_MESSAGES - 1)), msg],
    })),
  clearMessages: () => set({ messages: [] }),
  setPaused: (paused) => set({ paused }),
  setFilterKeyword: (keyword) => set({ filterKeyword: keyword }),
  setLoading: (loading) => set({ loading }),
  resetPubSub: () =>
    set({
      subscribedChannels: [],
      messages: [],
      paused: false,
      filterKeyword: "",
      loading: false,
    }),
}));
