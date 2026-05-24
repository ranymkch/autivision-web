"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo, useTransition } from "react";
import { ArrowRight, Search, Users, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import { createPatientGetId } from "../patients/actions";

type PatientLite = {
  id: string;
  code_anonymise: string;
  name: string | null;
  photo_url: string | null;
  age: number;
  sexe: "M" | "F" | "AUTRE";
};

type Mode = "existing" | "new";

export function QuestionnaireLandingClient({ patients }: { patients: PatientLite[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const isFr = locale === "fr";

  const [mode, setMode] = useState<Mode>(patients.length > 0 ? "existing" : "new");
  const [patientSearch, setPatientSearch] = useState("");
  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.code_anonymise.toLowerCase().includes(q) ||
        (p.name?.toLowerCase().includes(q) ?? false)
    );
  }, [patients, patientSearch]);

  const [picked, setPicked] = useState<string | null>(null);

  // New patient form state
  const [newName, setNewName] = useState("");
  const [newAge, setNewAge] = useState("");
  const [newSex, setNewSex] = useState<"M" | "F" | "AUTRE">("M");
  const [creating, startCreating] = useTransition();

  function handleStartExisting() {
    if (!picked) {
      toast.error(isFr ? "Choisissez un patient" : "Please select a patient");
      return;
    }
    router.push(`/questionnaire/${picked}`);
  }

  function handleCreateAndStart() {
    if (!newName.trim()) {
      toast.error(isFr ? "Le nom est requis." : "Name is required.");
      return;
    }
    startCreating(async () => {
      const res = await createPatientGetId(
        newName.trim(),
        newAge ? Number(newAge) : null,
        newSex,
        null
      );
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(isFr ? "Patient créé." : "Patient created.");
      router.push(`/questionnaire/${res.patientId}`);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-6 p-6 md:p-8">
        {/* Mode toggle */}
        {patients.length > 0 && (
          <div className="flex justify-end">
            <div className="inline-flex rounded-md border border-border bg-card text-xs">
              <ModeBtn active={mode === "existing"} onClick={() => setMode("existing")}>
                <Users className="h-3.5 w-3.5" />
                {isFr ? "Patient existant" : "Existing patient"}
              </ModeBtn>
              <ModeBtn active={mode === "new"} onClick={() => setMode("new")}>
                <UserPlus className="h-3.5 w-3.5" />
                {isFr ? "Nouveau patient" : "New patient"}
              </ModeBtn>
            </div>
          </div>
        )}

        {/* Existing patient */}
        {mode === "existing" && (
          <>
            <header className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">
                {isFr ? "Choisir un patient" : "Choose a patient"}
              </h2>
            </header>

            {patients.length > 0 ? (
              <div className="space-y-3">
                {patients.length > 3 && (
                  <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder={isFr ? "Rechercher un patient…" : "Search patient…"}
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="h-9 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                    />
                  </div>
                )}
                <ul className="grid gap-2 md:grid-cols-2">
                  {filteredPatients.map((p) => {
                    const active = picked === p.id;
                    return (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => setPicked(p.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                            active
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40"
                          )}
                        >
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
                            {p.photo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.photo_url} alt="" className="h-full w-full object-cover"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] font-mono text-muted-foreground">
                                {(p.name ?? p.code_anonymise).slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">
                              {p.name ?? p.code_anonymise}
                            </p>
                            <p className="font-mono text-[11px] text-muted-foreground">
                              {p.code_anonymise} · {isFr ? "Âge" : "Age"} {p.age} · {p.sexe}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {filteredPatients.length === 0 && patientSearch && (
                  <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    {isFr ? "Aucun résultat pour cette recherche." : "No results for this search."}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border p-8 text-center space-y-2">
                <p className="text-sm font-medium">
                  {isFr ? "Aucun patient éligible" : "No eligible patients"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isFr
                    ? "Tous les patients ont déjà un questionnaire, ou aucun patient n'existe. Créez-en un nouveau."
                    : "All patients already have a questionnaire, or none exist yet. Create a new one."}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button asChild variant="ghost">
                <Link href="/app/dashboard">{isFr ? "Annuler" : "Cancel"}</Link>
              </Button>
              <Button onClick={handleStartExisting} disabled={!picked}>
                {isFr ? "Démarrer le questionnaire" : "Start questionnaire"}
                <ArrowRight />
              </Button>
            </div>
          </>
        )}

        {/* New patient */}
        {mode === "new" && (
          <>
            <header className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">
                {isFr ? "Nouveau patient" : "New patient"}
              </h2>
            </header>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="new_name">{isFr ? "Nom (requis)" : "Name (required)"}</Label>
                <Input
                  id="new_name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={isFr ? "Nom du patient" : "Patient name"}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new_age">{isFr ? "Âge (optionnel)" : "Age (optional)"}</Label>
                  <Input
                    id="new_age"
                    type="number"
                    min={0}
                    max={30}
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new_sex">{t.app.screening.sexLabel}</Label>
                  <select
                    id="new_sex"
                    value={newSex}
                    onChange={(e) => setNewSex(e.target.value as any)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="M">{t.app.sex.M}</option>
                    <option value="F">{t.app.sex.F}</option>
                    <option value="AUTRE">{t.app.sex.AUTRE}</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button asChild variant="ghost">
                <Link href="/app/dashboard">{isFr ? "Annuler" : "Cancel"}</Link>
              </Button>
              <Button onClick={handleCreateAndStart} disabled={creating || !newName.trim()}>
                {creating
                  ? (isFr ? "Création…" : "Creating…")
                  : (isFr ? "Créer et démarrer" : "Create and start")}
                {!creating && <ArrowRight />}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors first:rounded-l-md last:rounded-r-md",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
      )}
    >
      {children}
    </button>
  );
}
