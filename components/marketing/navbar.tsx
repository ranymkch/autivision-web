"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LangSwitcher } from "@/components/shared/lang-switcher";
import { Wordmark } from "@/components/shared/wordmark";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export function MarketingNavbar() {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: t.nav.about,     href: "/about"       },
    { label: t.nav.whatIsAsd, href: "/what-is-asd" },
    { label: t.nav.metrics,   href: "/metrics"     },
    { label: t.nav.ethics, href: "/ethics" },
  ];

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/75 backdrop-blur-md"
          : "bg-transparent"
      )}
    >
      <div className="container-av flex h-16 items-center justify-between md:h-20">
        <Link href="/" className="flex items-center">
          <Wordmark size="md" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LangSwitcher />
          <ThemeToggle />
          <Button asChild size="sm" className="rounded-full">
            <Link href="/login">{t.nav.login}</Link>
          </Button>
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="border-b border-border bg-background px-6 pb-6 pt-2 md:hidden"
          >
            <div className="flex flex-col gap-4">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="font-display text-lg font-semibold"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 flex items-center gap-2">
                <LangSwitcher />
                <ThemeToggle />
              </div>
              <div className="flex flex-col gap-2">
                <Button asChild size="sm">
                  <Link href="/login">{t.nav.login}</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
