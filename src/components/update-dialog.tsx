"use client";

import { useState, useCallback, Component, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { downloadAndInstallUpdate, relaunchApp } from "@/lib/tauri-api";
import type { UpdateInfo, DownloadEvent } from "@/lib/tauri-api";
import { ArrowDownToLine, RefreshCw, Sparkles } from "lucide-react";

/** 更新状态 */
type UpdateState = "idle" | "downloading" | "downloaded" | "error";

/** 行内 Markdown 片段匹配规则 */
const INLINE_MARKDOWN_PATTERN =
  /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*[^*\n]+\*|_[^_\n]+_)/g;

interface UpdateDialogProps {
  /** 可用的更新信息，null 时弹窗关闭 */
  updateInfo: UpdateInfo | null;
  /** 关闭弹窗回调 */
  onDismiss: () => void;
}

/**
 * 更新提示弹窗 — 发现新版本时弹出
 * 通过 key={updateInfo?.version} 让 React 在新版本到来时自动重建内部组件，
 * 省去手动重置状态的逻辑
 */
export function UpdateDialog({ updateInfo, onDismiss }: UpdateDialogProps) {
  if (!updateInfo) return null;

  return (
    <UpdateDialogInner
      key={updateInfo.version}
      updateInfo={updateInfo}
      onDismiss={onDismiss}
    />
  );
}

/** 内部实现组件 — 每次 key 变化自动重置所有 state */
function UpdateDialogInner({
  updateInfo,
  onDismiss,
}: {
  updateInfo: UpdateInfo;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const [state, setState] = useState<UpdateState>("idle");
  const [progress, setProgress] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [downloadedSize, setDownloadedSize] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /** 下载进度回调 */
  const handleProgress = useCallback((event: DownloadEvent) => {
    switch (event.event) {
      case "Started":
        setTotalSize(event.data.contentLength ?? 0);
        setDownloadedSize(0);
        break;
      case "Progress":
        setDownloadedSize((prev) => {
          const next = prev + event.data.chunkLength;
          setTotalSize((total) => {
            if (total > 0) {
              setProgress(Math.min(100, Math.round((next / total) * 100)));
            }
            return total;
          });
          return next;
        });
        break;
      case "Finished":
        setProgress(100);
        setState("downloaded");
        break;
    }
  }, []);

  /** 开始下载并安装 */
  const handleDownload = useCallback(async () => {
    setState("downloading");
    setError(null);
    try {
      await downloadAndInstallUpdate(handleProgress);
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [handleProgress]);

  /** 重启应用 */
  const handleRelaunch = useCallback(async () => {
    setError(null);
    try {
      await relaunchApp();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  /** 格式化文件大小 */
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} className="text-primary" />
            {t("update.newVersion")}
          </DialogTitle>
          <DialogDescription>
            {t("settings.updateAvailable", { version: updateInfo.version })}
          </DialogDescription>
        </DialogHeader>

        {/* 更新说明 */}
        {updateInfo.body && (
          <div className="max-h-72 overflow-y-auto rounded-md border bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t("update.releaseNotes")}
            </p>
            <MarkdownErrorBoundary fallback={updateInfo.body}>
              <ReleaseNotesMarkdown content={updateInfo.body} />
            </MarkdownErrorBoundary>
          </div>
        )}

        {/* 下载进度条 */}
        {state === "downloading" && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {t("settings.downloading")} {progress}%
              </span>
              {totalSize > 0 && (
                <span>
                  {formatSize(downloadedSize)} / {formatSize(totalSize)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <DialogFooter>
          {state === "idle" && (
            <>
              <Button variant="outline" onClick={onDismiss}>
                {t("update.later")}
              </Button>
              <Button onClick={handleDownload}>
                <ArrowDownToLine size={16} className="mr-1" />
                {t("update.downloadInstall")}
              </Button>
            </>
          )}

          {state === "downloading" && (
            <Button variant="outline" disabled>
              <RefreshCw size={16} className="mr-1 animate-spin" />
              {t("settings.downloading")}
            </Button>
          )}

          {state === "downloaded" && (
            <Button onClick={handleRelaunch}>
              <RefreshCw size={16} className="mr-1" />
              {t("update.restartNow")}
            </Button>
          )}

          {state === "error" && (
            <>
              <Button variant="outline" onClick={onDismiss}>
                {t("actions.close")}
              </Button>
              <Button onClick={handleDownload}>{t("update.retry")}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 更新说明 Markdown 渲染组件，仅解析常见发布日志语法，不执行 HTML */
function ReleaseNotesMarkdown({ content }: { content: string }) {
  return <ReleaseNotesMarkdownInner content={content} />;
}

function ReleaseNotesMarkdownInner({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const codeFenceMatch = trimmed.match(/^```/);
    if (codeFenceMatch) {
      const codeLines: string[] = [];
      index += 1;

      while (
        index < lines.length &&
        !(lines[index] ?? "").trim().startsWith("```")
      ) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      nodes.push(
        <pre
          key={`code-${index}`}
          className="overflow-x-auto rounded-md bg-background p-2 font-mono text-xs leading-5 text-foreground"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      nodes.push(
        renderMarkdownHeading(
          headingMatch[1].length,
          headingMatch[2],
          `heading-${index}`,
        ),
      );
      index += 1;
      continue;
    }

    const unorderedListMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (unorderedListMatch) {
      const items: string[] = [];

      while (index < lines.length) {
        const itemMatch = (lines[index] ?? "").trim().match(/^[-*+]\s+(.+)$/);
        if (!itemMatch) break;
        items.push(itemMatch[1]);
        index += 1;
      }

      nodes.push(
        <ul
          key={`ul-${index}`}
          className="ml-4 list-disc space-y-1 text-sm leading-relaxed text-foreground"
        >
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    const orderedListMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (orderedListMatch) {
      const items: string[] = [];

      while (index < lines.length) {
        const itemMatch = (lines[index] ?? "").trim().match(/^\d+[.)]\s+(.+)$/);
        if (!itemMatch) break;
        items.push(itemMatch[1]);
        index += 1;
      }

      nodes.push(
        <ol
          key={`ol-${index}`}
          className="ml-4 list-decimal space-y-1 text-sm leading-relaxed text-foreground"
        >
          {items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];

      while (index < lines.length) {
        const quoteLine = (lines[index] ?? "").trim();
        if (!quoteLine.startsWith(">")) break;
        quoteLines.push(quoteLine.replace(/^>\s?/, ""));
        index += 1;
      }

      nodes.push(
        <blockquote
          key={`quote-${index}`}
          className="border-l-2 border-primary/40 pl-3 text-sm leading-relaxed text-muted-foreground"
        >
          {renderInlineMarkdown(quoteLines.join(" "))}
        </blockquote>,
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length) {
      const paragraphLine = (lines[index] ?? "").trim();
      if (!paragraphLine || isMarkdownBlockStart(paragraphLine)) break;
      paragraphLines.push(paragraphLine);
      index += 1;
    }

    nodes.push(
      <p key={`p-${index}`} className="text-sm leading-relaxed text-foreground">
        {renderInlineMarkdown(paragraphLines.join(" "))}
      </p>,
    );
  }

  return <div className="space-y-2">{nodes}</div>;
}

/** 判断当前行是否会开启新的 Markdown 块 */
function isMarkdownBlockStart(line: string): boolean {
  return (
    /^```/.test(line) ||
    /^#{1,6}\s+/.test(line) ||
    /^[-*+]\s+/.test(line) ||
    /^\d+[.)]\s+/.test(line) ||
    line.startsWith(">")
  );
}

/** 根据 Markdown 标题等级渲染合适尺寸的标题 */
function renderMarkdownHeading(
  level: number,
  text: string,
  key: string,
): ReactNode {
  if (level <= 2) {
    return (
      <h3 key={key} className="text-base font-semibold leading-snug">
        {renderInlineMarkdown(text)}
      </h3>
    );
  }

  if (level === 3) {
    return (
      <h4 key={key} className="text-sm font-semibold leading-snug">
        {renderInlineMarkdown(text)}
      </h4>
    );
  }

  return (
    <h5 key={key} className="text-sm font-medium leading-snug">
      {renderInlineMarkdown(text)}
    </h5>
  );
}

/** 渲染行内 Markdown，支持代码、粗体、斜体和 HTTP 链接 */
function renderInlineMarkdown(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(INLINE_MARKDOWN_PATTERN)) {
    const matchIndex = match.index ?? 0;
    const token = match[0];

    if (matchIndex > lastIndex) {
      nodes.push(text.slice(lastIndex, matchIndex));
    }

    nodes.push(renderInlineToken(token, `inline-${matchIndex}-${token}`));
    lastIndex = matchIndex + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

/** 渲染单个行内 Markdown token */
function renderInlineToken(token: string, key: string): ReactNode {
  if (token.startsWith("`") && token.endsWith("`")) {
    return (
      <code
        key={key}
        className="rounded bg-background px-1 py-0.5 font-mono text-xs"
      >
        {token.slice(1, -1)}
      </code>
    );
  }

  if (
    (token.startsWith("**") && token.endsWith("**")) ||
    (token.startsWith("__") && token.endsWith("__"))
  ) {
    return <strong key={key}>{token.slice(2, -2)}</strong>;
  }

  const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
  if (linkMatch) {
    return (
      <a
        key={key}
        href={linkMatch[2]}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-primary underline underline-offset-2"
      >
        {linkMatch[1]}
      </a>
    );
  }

  if (
    (token.startsWith("*") && token.endsWith("*")) ||
    (token.startsWith("_") && token.endsWith("_"))
  ) {
    return <em key={key}>{token.slice(1, -1)}</em>;
  }

  return token;
}

interface MarkdownErrorBoundaryProps {
  children: ReactNode;
  fallback: string;
}

interface MarkdownErrorBoundaryState {
  hasError: boolean;
}

/** Markdown 渲染局部错误边界 — 解析异常时降级为原始文本 */
class MarkdownErrorBoundary extends Component<
  MarkdownErrorBoundaryProps,
  MarkdownErrorBoundaryState
> {
  constructor(props: MarkdownErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): MarkdownErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {this.props.fallback}
        </pre>
      );
    }
    return this.props.children;
  }
}
