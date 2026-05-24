"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

type PatientRow = {
  id: string;
  code_anonymise: string;
  name: string | null;
  photo_url: string | null;
  age: number | null;
  sexe: string;
  created_at: string;
};

export function PatientsTable({
  patients,
  showIdentity,
  defaultQuery = "",
}: {
  patients: PatientRow[];
  showIdentity: boolean;
  defaultQuery?: string;
}) {
  const { t, locale } = useI18n();
  const isFr = locale === "fr";
  const [query, setQuery] = useState(defaultQuery);

  const filtered = query.trim()
    ? patients.filter((p) => {
        const q = query.trim().toLowerCase();
        return (
          p.code_anonymise.toLowerCase().includes(q) ||
          (p.name?.toLowerCase().includes(q) ?? false)
        );
      })
    : patients;

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          type="search"
          placeholder={isFr ? "Rechercher par nom ou code…" : "Search by name or code…"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
      </div>

      {filtered.length > 0 ? (
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3 font-medium">{t.app.patients.table.name}</th>
              <th className="px-5 py-3 font-medium">{t.app.patients.table.code}</th>
              <th className="px-5 py-3 font-medium">{t.app.patients.table.age}</th>
              <th className="px-5 py-3 font-medium">{t.app.patients.table.sex}</th>
              <th className="px-5 py-3 font-medium">{t.app.patients.table.created}</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    {showIdentity && (
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
                        {p.photo_url ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.photo_url}
                              alt=""
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                                const sib = (e.currentTarget as HTMLImageElement).nextElementSibling as HTMLElement | null;
                                if (sib) sib.style.display = "flex";
                              }}
                            />
                            <div
                              style={{ display: "none" }}
                              className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-muted-foreground"
                            >
                              {(p.name ?? p.code_anonymise).slice(0, 2).toUpperCase()}
                            </div>
                          </>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-mono text-muted-foreground">
                            {(p.name ?? p.code_anonymise).slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}
                    <span className="font-medium">
                      {showIdentity ? (p.name ?? "—") : "—"}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 font-mono text-xs">{p.code_anonymise}</td>
                <td className="px-5 py-3">{p.age ?? "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">{t.app.sex[p.sexe as keyof typeof t.app.sex] ?? p.sexe}</td>
                <td className="px-5 py-3 text-muted-foreground">{formatDate(p.created_at)}</td>
                <td className="px-5 py-3 text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/app/patients/${p.id}`}>{t.common.view} <ArrowRight /></Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {query.trim()
            ? (isFr ? "Aucun patient ne correspond à la recherche." : "No patients match your search.")
            : t.app.patients.empty}
        </p>
      )}
    </div>
  );
}
