"use client";

import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import type { KeyInfo } from "@/stores/browser-store";
import { StringViewer } from "./string-viewer";
import { HashViewer } from "./hash-viewer";
import { ListViewer } from "./list-viewer";
import { SetViewer } from "./set-viewer";
import { ZSetViewer } from "./zset-viewer";
import { StreamViewer } from "./stream-viewer";
import { JsonViewer } from "./json-viewer";

/** 在 useEffect 中安全调用数据加载函数，避免 react-hooks/set-state-in-effect */
export function useLoadEffect(
  loadFn: () => Promise<void>,
  deps: React.DependencyList,
) {
  const ref = useRef(loadFn);
  ref.current = loadFn;
  useEffect(() => {
    ref.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** 表格默认每页加载条数 */
export const DEFAULT_TABLE_PAGE_SIZE = 10;

interface ValueViewerProps {
  keyName: string;
  keyInfo: KeyInfo;
  onValueChanged: () => void;
}

/** 值查看器 — 根据 Key 类型分发不同渲染 */
export function ValueViewer({
  keyName,
  keyInfo,
  onValueChanged,
}: ValueViewerProps) {
  const { t } = useTranslation();
  const totalCount = keyInfo.length;
  if (keyInfo.key_type === "none" || keyInfo.ttl === -2) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        {t("valueEditor.keyExpired")}
      </div>
    );
  }

  switch (keyInfo.key_type) {
    case "string":
      return (
        <StringViewer
          keyName={keyName}
          keyInfo={keyInfo}
          onValueChanged={onValueChanged}
        />
      );
    case "hash":
      return (
        <HashViewer
          keyName={keyName}
          totalCount={totalCount}
          onValueChanged={onValueChanged}
        />
      );
    case "list":
      return (
        <ListViewer
          keyName={keyName}
          totalCount={totalCount}
          onValueChanged={onValueChanged}
        />
      );
    case "set":
      return (
        <SetViewer
          keyName={keyName}
          totalCount={totalCount}
          onValueChanged={onValueChanged}
        />
      );
    case "zset":
      return (
        <ZSetViewer
          keyName={keyName}
          totalCount={totalCount}
          onValueChanged={onValueChanged}
        />
      );
    case "stream":
      return (
        <StreamViewer
          keyName={keyName}
          totalCount={totalCount}
          onValueChanged={onValueChanged}
        />
      );
    case "rejson":
      return <JsonViewer keyName={keyName} onValueChanged={onValueChanged} />;
    default:
      return (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          {t("valueViewer.unsupportedType", { type: keyInfo.key_type })}
        </div>
      );
  }
}
