import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LangSwitcher } from "@/components/shared/lang-switcher";
import { Wordmark } from "@/components/shared/wordmark";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 bg-grid-light bg-grid opacity-50 dark:bg-grid-dark" />
      <div className="pointer-events-none absolute inset-0 bg-radial-fade" />

      <div className="container-av relative z-10 flex h-16 items-center justify-between md:h-20">
        <Link href="/" className="inline-flex items-center">
          <Wordmark size="md" />
        </Link>
        <div className="flex items-center gap-1">
          <LangSwitcher />
          <ThemeToggle />
        </div>
      </div>

      <main className="relative z-10 flex min-h-[calc(100vh-5rem)] items-center justify-center px-6 py-12">
        {children}
      </main>
    </div>
  );
}
