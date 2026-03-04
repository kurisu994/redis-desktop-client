"use client";

import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import "@/i18n";

/** 全局 Provider 组件，集成 HeroUI + 主题切换 + i18n */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark">
      <HeroUIProvider>{children}</HeroUIProvider>
    </NextThemesProvider>
  );
}
