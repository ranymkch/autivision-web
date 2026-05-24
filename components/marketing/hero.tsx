"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { useAuth } from "@/components/providers/auth-provider";

const HologramBrain = dynamic(
  () => import("./hologram-brain").then((m) => m.HologramBrain),
  { ssr: false, loading: () => null }
);

export function Hero() {
  const { t } = useI18n();
  const { isAuthenticated } = useAuth();

  const primaryHref = isAuthenticated ? "/app/screening" : "/login?next=/app/screening";
  const primaryLabel = isAuthenticated ? t.hero.goToScreening : t.hero.primary;

  return (
    <section className="relative overflow-hidden pt-28 md:pt-36">
      <div className="pointer-events-none absolute inset-0 bg-grid-light bg-grid opacity-50 dark:bg-grid-dark" />
      <div className="pointer-events-none absolute inset-0 bg-radial-fade" />

      <div className="container-av relative z-10 grid grid-cols-1 items-center gap-10 pb-20 md:grid-cols-2 md:gap-12 md:pb-28">
        {/* Left — text (balanced weight with brain) */}
        <div className="space-y-6 md:space-y-7">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              {t.hero.badge}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="font-display text-balance text-[clamp(2.25rem,4.6vw,4rem)] font-semibold leading-[1.05] tracking-tight"
          >
            {t.hero.title}
            <br />
            <span className="text-primary">{t.hero.titleAccent}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="max-w-xl text-base leading-relaxed text-muted-foreground"
          >
            {t.hero.subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="flex flex-wrap gap-3"
          >
            <Button asChild size="lg">
              <Link href={primaryHref}>
                {primaryLabel} <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link href="/what-is-asd">{t.hero.secondary}</Link>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-xs text-muted-foreground"
          >
            {t.hero.note}
          </motion.p>
        </div>

        {/* Right — brain (taller + wider on desktop for visual parity) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.0, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-[440px] sm:h-[500px] md:h-[600px] lg:h-[640px]"
        >
          <HologramBrain />
        </motion.div>
      </div>
    </section>
  );
}
