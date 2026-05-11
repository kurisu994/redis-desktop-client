"use client";

import { useEffect, useSyncExternalStore } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import "@/i18n";

const emptySubscribe = () => () => {};

/** 检测客户端是否已挂载，避免 SSR/CSR 不一致 */
function useHasMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/** 关闭输入框的自动大写、自动纠错和拼写检查 */
function disableTextInputAssistance(root: ParentNode): void {
  root.querySelectorAll("input, textarea").forEach((element) => {
    element.setAttribute("autocapitalize", "off");
    element.setAttribute("autocorrect", "off");
    element.setAttribute("spellcheck", "false");
  });
}

/** 全局 Provider 组件，集成主题切换 + Tooltip + i18n */
export function Providers({ children }: { children: React.ReactNode }) {
  const mounted = useHasMounted();

  /** 监听动态弹窗和虚拟列表中的输入框，统一关闭文本辅助 */
  useEffect(() => {
    if (!mounted) return;

    disableTextInputAssistance(document);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches("input, textarea")) {
            disableTextInputAssistance(node.parentElement ?? document);
          } else {
            disableTextInputAssistance(node);
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [mounted]);

  /* 等待客户端挂载，避免 i18n LanguageDetector 导致的 Hydration 不一致 */
  if (!mounted) {
    return null;
  }

  return (
    <NextThemesProvider attribute="class" defaultTheme="dark">
      <TooltipProvider delayDuration={300}>
        {children}
        <Toaster position="top-right" richColors />
      </TooltipProvider>
    </NextThemesProvider>
  );
}
