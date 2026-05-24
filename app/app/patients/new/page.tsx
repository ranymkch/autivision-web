"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ArrowLeft, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { useI18n } from "@/lib/i18n/provider";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { createPatient, type CreatePatientState } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const initial: CreatePatientState = {};

export default function NewPatientPage() {
  const { t, locale } = useI18n();
  const { role } = useAuth();
  const router = useRouter();
  const [state, formAction] = useFormState(createPatient, initial);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Redirect secretaries — doctor guard (belt-and-suspenders; server also guards)
  useEffect(() => {
    if (role && role !== "doctor") router.replace("/app/dashboard");
  }, [role, router]);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  async function handleFile(file: File) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not signed in");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;

      console.debug("[avatar] uploading to bucket=patient-photos path=", path);

      const { error: upError } = await supabase.storage
        .from("patient-photos")
        .upload(path, file, { contentType: file.type, upsert: false });

      if (upError) {
        console.error("[avatar] upload error", upError);
        throw upError;
      }

      console.debug("[avatar] upload ok, getting public URL for path=", path);

      const { data } = supabase.storage.from("patient-photos").getPublicUrl(path);
      const publicUrl = data.publicUrl;

      console.debug("[avatar] public URL=", publicUrl);

      setPhotoUrl(publicUrl);

      console.debug("[avatar] photoUrl state set to", publicUrl);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (role && role !== "doctor") return null;

  return (
    <div className="mx-auto max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/app/patients"><ArrowLeft /> {t.app.patients.title}</Link>
      </Button>

      <PageHeader title={t.app.patients.form.title} subtitle={t.app.patients.subtitle} />

      <Card>
        <CardContent className="p-6">
          <form action={formAction} className="space-y-5">
            {/* Hidden field carries the uploaded URL into the server action */}
            <input type="hidden" name="photo_url" value={photoUrl ?? ""} />

            {/* Photo */}
            <div className="space-y-2">
              <Label>{locale === "fr" ? "Photo (requis)" : "Photo (required)"}</Label>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                      onLoad={() => console.debug("[avatar] <img> rendered src=", photoUrl)}
                      onError={(e) => console.error("[avatar] <img> load error src=", (e.target as HTMLImageElement).src)}
                    />
                  ) : (
                    <ImagePlus className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                    {photoUrl
                      ? (locale === "fr" ? "Changer" : "Replace")
                      : (locale === "fr" ? "Téléverser" : "Upload")}
                  </Button>
                  {photoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setPhotoUrl(null)}
                    >
                      <X className="h-4 w-4" />
                      {locale === "fr" ? "Retirer" : "Remove"}
                    </Button>
                  )}
                </div>
              </div>
              {photoUrl && (
                <p className="text-[11px] font-mono text-muted-foreground break-all">
                  {photoUrl}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{locale === "fr" ? "Nom (requis)" : "Name (required)"}</Label>
              <Input id="name" name="name" maxLength={120} required />
              <p className="text-[11px] text-muted-foreground">
                {locale === "fr"
                  ? "Affiché uniquement dans le tableau de bord. Le rapport utilise le code anonymisé."
                  : "Shown only in the dashboard. Reports use the anonymous code."}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="age">{locale === "fr" ? "Âge (optionnel)" : "Age (optional)"}</Label>
                <Input id="age" name="age" type="number" min={0} max={30} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sexe">{t.app.patients.form.sex}</Label>
                <select
                  id="sexe"
                  name="sexe"
                  required
                  defaultValue="M"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="M">{t.app.sex.M}</option>
                  <option value="F">{t.app.sex.F}</option>
                  <option value="AUTRE">{t.app.sex.AUTRE}</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" asChild>
                <Link href="/app/patients">{t.app.patients.form.cancel}</Link>
              </Button>
              <Submit label={t.app.patients.form.submit} uploading={uploading} photoMissing={!photoUrl} />
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Submit({ label, uploading, photoMissing }: { label: string; uploading: boolean; photoMissing: boolean }) {
  const { pending } = useFormStatus();
  const { locale } = useI18n();
  const isFr = locale === "fr";
  const isDisabled = pending || uploading || photoMissing;
  return (
    <Button type="submit" disabled={isDisabled} title={photoMissing ? (isFr ? "Téléversez une photo d'abord" : "Upload a photo first") : undefined}>
      {uploading ? (isFr ? "Téléversement…" : "Uploading photo…") : pending ? "…" : label}
    </Button>
  );
}
