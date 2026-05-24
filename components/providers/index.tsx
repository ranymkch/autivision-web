"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "./theme-provider";
import { I18nProvider } from "@/lib/i18n/provider";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        {children}
        <Toaster />
      </I18nProvider>
    </ThemeProvider>
  );
}
