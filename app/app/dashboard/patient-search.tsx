"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/provider";

export function PatientSearch() {
  const { locale } = useI18n();
  const isFr = locale === "fr";
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && query.trim()) {
      router.push(`/app/patients?q=${encodeURIComponent(query.trim())}`);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3">
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Input
        type="search"
        placeholder={isFr ? "Rechercher un patient…" : "Search patients…"}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
      />
    </div>
  );
}
