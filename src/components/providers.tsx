"use client";

import { useSyncExternalStore } from "react";
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

/** 全局 Provider 组件，集成主题切换 + Tooltip + i18n */
export function Providers({ children }: { children: React.ReactNode }) {
  const mounted = useHasMounted();

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
