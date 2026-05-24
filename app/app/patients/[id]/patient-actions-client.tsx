"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Edit2, Trash2, X, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import { updatePatient, deletePatient } from "../actions";

interface PatientActionsProps {
  patientId: string;
  initialName: string | null;
  initialAge: number | null;
  initialSexe: "M" | "F" | "AUTRE";
  initialPhotoUrl: string | null;
}

export function PatientActionsClient({
  patientId,
  initialName,
  initialAge,
  initialSexe,
  initialPhotoUrl,
}: PatientActionsProps) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const isFr = locale === "fr";
  const [showEdit, setShowEdit] = useState(false);

  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const boundUpdate = updatePatient.bind(null, patientId);
  const [updateState, updateAction] = useFormState(boundUpdate, {});

  useEffect(() => {
    if (updateState.ok) {
      toast.success(isFr ? "Patient mis à jour" : "Patient updated");
      setShowEdit(false);
      router.refresh();
    }
    if (updateState.error) {
      toast.error(updateState.error);
    }
  }, [updateState, isFr, router]);

  async function handlePhotoFile(file: File) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error(isFr ? "Non connecté" : "Not signed in"); return; }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("patient-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("patient-photos").getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
    } catch (e: any) {
      toast.error(e?.message ?? (isFr ? "Échec du téléversement" : "Upload failed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
          <Edit2 className="h-4 w-4" />
          {t.app.patients.edit}
        </Button>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">{t.app.patients.form.editTitle}</CardTitle>
              <Button size="icon" variant="ghost" onClick={() => setShowEdit(false)} className="h-7 w-7">
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form action={updateAction} className="space-y-4">
                {/* Hidden field carries the photo URL into the server action */}
                <input type="hidden" name="photo_url" value={photoUrl} />

                {/* Photo upload */}
                <div className="space-y-1.5">
                  <Label>{isFr ? "Photo du patient" : "Patient photo"}</Label>
                  <div className="flex items-center gap-3">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary">
                      {photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImagePlus className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handlePhotoFile(f);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                      >
                        {uploading
                          ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {isFr ? "Téléversement…" : "Uploading…"}</>
                          : <><ImagePlus className="h-3.5 w-3.5" /> {photoUrl ? (isFr ? "Changer" : "Replace") : (isFr ? "Téléverser" : "Upload")}</>
                        }
                      </Button>
                      {photoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs text-muted-foreground"
                          onClick={() => setPhotoUrl("")}
                        >
                          <X className="h-3 w-3" /> {isFr ? "Retirer" : "Remove"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit_name">{t.app.patients.form.name}</Label>
                  <Input
                    id="edit_name"
                    name="name"
                    defaultValue={initialName ?? ""}
                    placeholder={isFr ? "Nom du patient" : "Patient name"}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_age">{t.app.patients.form.age}</Label>
                    <Input
                      id="edit_age"
                      name="age"
                      type="number"
                      min={0}
                      max={30}
                      defaultValue={initialAge ?? ""}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit_sexe">{t.app.patients.form.sex}</Label>
                    <select
                      id="edit_sexe"
                      name="sexe"
                      defaultValue={initialSexe}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="M">{t.app.sex.M}</option>
                      <option value="F">{t.app.sex.F}</option>
                      <option value="AUTRE">{t.app.sex.AUTRE}</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowEdit(false)}>
                    {t.app.patients.form.cancel}
                  </Button>
                  <UpdateSubmitButton label={t.app.patients.form.update} uploading={uploading} />
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

// Separate delete component — rendered at the bottom of the patient detail page
export function PatientDeleteButton({ patientId }: { patientId: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const isFr = locale === "fr";
  const [deleting, startDeleting] = useTransition();

  function handleDelete() {
    startDeleting(async () => {
      const res = await deletePatient(patientId);
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(isFr ? "Patient supprimé" : "Patient deleted");
        router.push("/app/patients");
      }
    });
  }

  return (
    <div className="mt-10 border-t border-border pt-8">
      <p className="mb-3 text-sm text-muted-foreground">
        La suppression du patient est permanente et irréversible. Toutes les évaluations et rapports associés seront également supprimés.
      </p>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={deleting}
      >
        {deleting ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> …</> : <><Trash2 className="h-4 w-4" />{t.app.patients.deleteBtn}</>}
      </Button>
    </div>
  );
}

function UpdateSubmitButton({ label, uploading }: { label: string; uploading: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending || uploading}>
      {pending ? "…" : label}
    </Button>
  );
}
