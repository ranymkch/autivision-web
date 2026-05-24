"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, UserPlus, Users, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/app/image-uploader";
import { useI18n } from "@/lib/i18n/provider";
import { imageScore, tierFor, type MLPrediction } from "@/lib/ml/predict";
import { createClient } from "@/lib/supabase/client";
import { saveScreening } from "./actions";
import { cn } from "@/lib/utils";

type PatientLite = {
  id: string;
  code_anonymise: string;
  name: string | null;
  age: number;
  sexe: "M" | "F" | "AUTRE";
  photo_url: string | null;
};

type Mode = "existing" | "new";

export function ScreeningClient({
  patients,
  preSelectedPatient = null,
}: {
  patients: PatientLite[];
  preSelectedPatient?: PatientLite | null;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const isFr = locale === "fr";

  const [mode, setMode] = useState<Mode>(
    preSelectedPatient ? "existing" : (patients.length > 0 ? "existing" : "new")
  );

  const [selectedPatient, setSelectedPatient] = useState<PatientLite | null>(null);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"M" | "F" | "AUTRE">("M");
  const [file, setFile] = useState<File | null>(null);

  const [analysing, setAnalysing] = useState(false);
  const [analyseError, setAnalyseError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

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

  const [existingBlob, setExistingBlob] = useState<File | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [photoMode, setPhotoMode] = useState<"keep" | "new">("keep");
  const [newScreeningFile, setNewScreeningFile] = useState<File | null>(null);

  useEffect(() => {
    if (preSelectedPatient) selectPatient(preSelectedPatient);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function selectPatient(p: PatientLite) {
    setSelectedPatient(p);
    setExistingBlob(null);
    setNewScreeningFile(null);
    setPhotoMode(p.photo_url ? "keep" : "new");
    if (p.photo_url) {
      setLoadingPhoto(true);
      try {
        const res = await fetch(p.photo_url);
        const blob = await res.blob();
        setExistingBlob(new File([blob], "patient-photo.jpg", { type: blob.type || "image/jpeg" }));
      } catch {
        toast.error(isFr ? "Impossible de charger la photo." : "Could not load patient photo.");
      } finally {
        setLoadingPhoto(false);
      }
    }
  }

  const activeFile = mode === "existing"
    ? (photoMode === "new" ? newScreeningFile : existingBlob)
    : file;

  const patientReady =
    (mode === "existing" && !!selectedPatient && !!activeFile) ||
    (mode === "new" && name.trim() !== "" && !!file);

  const canRun = !!activeFile && !analysing && !loadingPhoto;

  async function runAnalysisAndRedirect() {
    if (!activeFile || !patientReady) return;
    setAnalyseError(null);
    setAnalysing(true);

    let ml: MLPrediction | null = null;

    try {
      // 1. Run ML inference
      const fd = new FormData();
      fd.append("file", activeFile);
      const res = await fetch("/api/predict", { method: "POST", body: fd });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? `Inference failed (${res.status})`);
      }
      ml = (await res.json()) as MLPrediction;
      toast.success(isFr ? "Analyse terminée" : "Analysis complete");
    } catch (e: any) {
      const msg = e?.message ?? "Inference failed";
      setAnalyseError(msg);
      toast.error(msg);
      setAnalysing(false);
      return;
    }

    // 2. Save screening + redirect to result page
    startSaving(async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const ownerKey = mode === "existing" && selectedPatient ? selectedPatient.id : "anon";
        const ext = activeFile.name.split(".").pop() || "jpg";
        const ts = Date.now();
        const path = `${user.id}/${ownerKey}/${ts}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("facial-images")
          .upload(path, activeFile, { contentType: activeFile.type, upsert: false });
        if (upErr) throw upErr;

        // For new patients: also save to patient-photos bucket (publicly readable)
        // so the patient profile photo actually loads in the browser.
        let photoUrl: string | null = null;
        if (mode === "new" && file) {
          const photoPath = `${user.id}/${ts}.${ext}`;
          const { error: photoUpErr } = await supabase.storage
            .from("patient-photos")
            .upload(photoPath, activeFile, { contentType: activeFile.type, upsert: false });
          if (!photoUpErr) {
            const { data: urlData } = supabase.storage
              .from("patient-photos")
              .getPublicUrl(photoPath);
            photoUrl = urlData?.publicUrl ?? null;
          }
          // Fallback: use facial-images URL if patient-photos upload failed
          if (!photoUrl) {
            const { data: urlData } = supabase.storage
              .from("facial-images")
              .getPublicUrl(path);
            photoUrl = urlData?.publicUrl ?? null;
          }
        }

        const result = await saveScreening({
          patientId: mode === "existing" ? selectedPatient!.id : null,
          newPatient: mode === "new"
            ? { age: age !== "" ? Number(age) : null, sexe: sex, name: name.trim(), photoUrl }
            : null,
          imageStoragePath: path,
          imageSize: activeFile.size,
          imageMime: activeFile.type,
          ml: ml!,
          updatePatientPhoto: mode === "existing" && photoMode === "new",
        });
        if (!result.ok || !result.evaluationId) throw new Error(result.error ?? "Save failed");

        router.push(`/app/screening/result/${result.evaluationId}`);
      } catch (e: any) {
        toast.error(e?.message ?? "Save failed");
      } finally {
        setAnalysing(false);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 p-6 md:p-8">

          {/* Mode toggle — hidden when coming from a specific patient's redo button */}
          {patients.length > 0 && !preSelectedPatient && (
            <div className="flex justify-end">
              <div className="inline-flex rounded-md border border-border bg-card text-xs">
                <ModeBtn active={mode === "existing"} onClick={() => { setMode("existing"); }}>
                  <Users className="h-3.5 w-3.5" /> {t.app.screening.pickPatient}
                </ModeBtn>
                <ModeBtn active={mode === "new"} onClick={() => { setMode("new"); }}>
                  <UserPlus className="h-3.5 w-3.5" /> {t.app.screening.newPatient}
                </ModeBtn>
              </div>
            </div>
          )}

          {/* Existing patient */}
          {mode === "existing" && (
            <section className="space-y-4">
              <h2 className="font-display text-lg font-bold">{t.app.screening.patient}</h2>
              {!preSelectedPatient && patients.length > 3 && (
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
              {!preSelectedPatient && (
              <div className="grid gap-2 md:grid-cols-2">
                {filteredPatients.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => selectPatient(p)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                      selectedPatient?.id === p.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
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
                            className="absolute inset-0 flex items-center justify-center text-xs font-mono text-muted-foreground"
                          >
                            {(p.name ?? p.code_anonymise).slice(0, 2).toUpperCase()}
                          </div>
                        </>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-mono text-muted-foreground">
                          {(p.name ?? p.code_anonymise).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{p.name ?? p.code_anonymise}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {p.code_anonymise} · {isFr ? "Âge" : "Age"} {p.age} · {p.sexe}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              )}

              {selectedPatient && (
                <div className="mt-2 rounded-xl border border-border bg-secondary/30 p-4 space-y-4">
                  {/* Toggle — only shown when the patient already has a photo */}
                  {selectedPatient.photo_url && (
                    <div className="inline-flex rounded-md border border-border bg-card text-xs">
                      <button
                        type="button"
                        onClick={() => setPhotoMode("keep")}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors rounded-l-md",
                          photoMode === "keep" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        {isFr ? "Photo actuelle" : "Current photo"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhotoMode("new")}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors rounded-r-md",
                          photoMode === "new" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                        )}
                      >
                        {isFr ? "Nouvelle image" : "New image"}
                      </button>
                    </div>
                  )}

                  {/* Keep current photo — preview */}
                  {photoMode === "keep" && selectedPatient.photo_url && (
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedPatient.photo_url}
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
                          className="absolute inset-0 flex items-center justify-center text-xs font-mono text-muted-foreground"
                        >
                          {(selectedPatient.name ?? selectedPatient.code_anonymise).slice(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{selectedPatient.name ?? selectedPatient.code_anonymise}</p>
                        {loadingPhoto && (
                          <p className="mt-1 text-xs text-muted-foreground animate-pulse">
                            {isFr ? "Chargement de la photo…" : "Loading photo…"}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Upload new screening image */}
                  {(photoMode === "new" || !selectedPatient.photo_url) && (
                    <div className="space-y-2">
                      <ImageUploader value={newScreeningFile} onChange={setNewScreeningFile} />
                      <p className="text-xs text-muted-foreground">
                        {isFr
                          ? "Cette image sera utilisée pour le dépistage et enregistrée comme photo de profil du patient."
                          : "This image will be used for screening and saved as the patient's profile photo."}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* New patient */}
          {mode === "new" && (
            <section className="space-y-5">
              <h2 className="font-display text-lg font-bold">
                {isFr ? "Nouveau patient" : "New patient"}
              </h2>

              <div className="space-y-2">
                <Label>{isFr ? "Photo du patient (utilisée pour le dépistage)" : "Patient photo (used for screening)"}</Label>
                <ImageUploader
                  value={file}
                  onChange={(f) => setFile(f)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="name">{isFr ? "Nom (requis)" : "Name (required)"}</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={isFr ? "Nom du patient" : "Patient name"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age">{isFr ? "Âge (optionnel)" : "Age (optional)"}</Label>
                  <Input
                    id="age"
                    type="number"
                    min={0}
                    max={30}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sex">{t.app.screening.sexLabel}</Label>
                  <select
                    id="sex"
                    value={sex}
                    onChange={(e) => setSex(e.target.value as any)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="M">{t.app.sex.M}</option>
                    <option value="F">{t.app.sex.F}</option>
                    <option value="AUTRE">{t.app.sex.AUTRE}</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {analyseError && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">{isFr ? "L'analyse a échoué" : "Analysis failed"}</p>
                <p className="text-destructive/80">{analyseError}</p>
              </div>
            </div>
          )}

          {canRun && (
            <div className="flex justify-end">
              <Button
                onClick={runAnalysisAndRedirect}
                disabled={analysing || saving || !patientReady}
              >
                {analysing || saving ? (
                  isFr ? "Analyse en cours…" : "Analysing…"
                ) : (
                  <>
                    <Sparkles /> {t.app.screening.runAnalysis}
                  </>
                )}
              </Button>
            </div>
          )}

          {!patientReady && mode === "new" && (
            <p className="text-xs text-muted-foreground text-right">
              {isFr
                ? "Renseignez le nom et ajoutez une photo pour continuer."
                : "Enter a name and add a photo to continue."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
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
