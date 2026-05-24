"use client";

import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";
import { saveLocale } from "@/app/app/settings/actions";

export function LangSwitcher() {
  const { locale, setLocale } = useI18n();
  const next = locale === "en" ? "fr" : "en";

  function handleSwitch() {
    setLocale(next);
    saveLocale(next).catch(() => {});
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSwitch}
      aria-label={`Switch language to ${next}`}
      className="gap-1.5"
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs font-semibold uppercase tracking-wider">{locale}</span>
    </Button>
  );
}
