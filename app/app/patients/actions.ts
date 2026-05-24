"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { patientSchema } from "@/lib/validations/patient";
import { generateAnonymousCode } from "@/lib/utils";
import { getSessionWithRole } from "@/lib/supabase/session";
import { can } from "@/lib/rbac";

export type CreatePatientState = { error?: string };

export async function createPatient(_prev: CreatePatientState, formData: FormData): Promise<CreatePatientState> {
  const { user, role, supabase } = await getSessionWithRole();
  if (!user) return { error: "Not authenticated." };
  if (!can(role, "patients:write")) return { error: "Not authorised." };

  const rawAge = formData.get("age");
  const parsed = patientSchema.safeParse({
    name: (formData.get("name") as string)?.trim() || null,
    age: rawAge !== "" && rawAge !== null ? rawAge : undefined,
    sexe: formData.get("sexe"),
    notes: formData.get("notes") || null,
    photo_url: (formData.get("photo_url") as string) || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const code = generateAnonymousCode();

  const { error: insertError, data: inserted } = await supabase
    .from("patients")
    .insert({
      owner_id: user.id,
      code_anonymise: code,
      name: parsed.data.name,
      photo_url: parsed.data.photo_url,
      age: parsed.data.age ?? null,
      sexe: parsed.data.sexe,
      notes: parsed.data.notes ?? null,
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };

  await supabase.from("history").insert({
    patient_id: (inserted as any).id,
    actor_id: user.id,
    action: "PATIENT_CREATED",
    details: { code },
  });

  revalidatePath("/app/patients");
  redirect(`/app/patients/${(inserted as any).id}`);
}

const updateSchema = z.object({
  name: z.string().min(1).nullable().optional(),
  age: z.coerce.number().int().min(0).max(30).nullable().optional(),
  sexe: z.enum(["M", "F", "AUTRE"]),
  notes: z.string().nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
});

export type UpdatePatientState = { error?: string; ok?: boolean };

export async function updatePatient(
  patientId: string,
  _prev: UpdatePatientState,
  formData: FormData
): Promise<UpdatePatientState> {
  const { user, role, supabase } = await getSessionWithRole();
  if (!user) return { error: "Not authenticated." };
  if (!can(role, "patients:write")) return { error: "Not authorised." };

  const rawAge = formData.get("age");
  const parsed = updateSchema.safeParse({
    name: (formData.get("name") as string)?.trim() || null,
    age: rawAge !== "" && rawAge !== null ? rawAge : null,
    sexe: formData.get("sexe"),
    notes: (formData.get("notes") as string) || null,
    photo_url: (formData.get("photo_url") as string) || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  // Check what actually changed before writing to avoid spurious history entries.
  const { data: current } = await supabase
    .from("patients")
    .select("name, age, sexe, notes, photo_url")
    .eq("id", patientId)
    .single();

  const newName = parsed.data.name ?? null;
  const newAge = parsed.data.age ?? null;
  const newNotes = parsed.data.notes ?? null;
  const newPhoto = parsed.data.photo_url ?? null;

  const hasChanged =
    (current?.name ?? null) !== newName ||
    (current?.age ?? null) !== newAge ||
    current?.sexe !== parsed.data.sexe ||
    (current?.notes ?? null) !== newNotes ||
    (current?.photo_url ?? null) !== newPhoto;

  if (!hasChanged) {
    revalidatePath(`/app/patients/${patientId}`);
    return { ok: true };
  }

  const { error } = await supabase
    .from("patients")
    .update({
      name: newName,
      age: newAge,
      sexe: parsed.data.sexe,
      notes: newNotes,
      photo_url: newPhoto,
    })
    .eq("id", patientId);

  if (error) return { error: error.message };

  await supabase.from("history").insert({
    patient_id: patientId,
    actor_id: user.id,
    action: "PATIENT_UPDATED",
    details: {},
  });

  revalidatePath(`/app/patients/${patientId}`);
  revalidatePath("/app/patients");
  return { ok: true };
}

/** Updates only the clinical notes field — does not touch name, age, photo_url, or sexe. */
export async function updatePatientNotes(
  patientId: string,
  notes: string | null
): Promise<{ error?: string; ok?: boolean }> {
  const { user, role, supabase } = await getSessionWithRole();
  if (!user) return { error: "Not authenticated." };
  if (!can(role, "patients:write")) return { error: "Not authorised." };

  const { error } = await supabase
    .from("patients")
    .update({ notes: notes || null })
    .eq("id", patientId);

  if (error) return { error: error.message };

  revalidatePath(`/app/patients/${patientId}`);
  return { ok: true };
}

/** Creates a patient and returns its ID — used by questionnaire/screening flows that need to stay on the same page. */
export async function createPatientGetId(
  name: string,
  age: number | null,
  sexe: "M" | "F" | "AUTRE",
  photoUrl: string | null
): Promise<{ error?: string; patientId?: string }> {
  const { user, role, supabase } = await getSessionWithRole();
  if (!user) return { error: "Not authenticated." };
  if (!can(role, "patients:write")) return { error: "Not authorised." };

  const code = generateAnonymousCode();
  const { error: insertError, data: inserted } = await supabase
    .from("patients")
    .insert({
      owner_id: user.id,
      code_anonymise: code,
      name: name || null,
      photo_url: photoUrl || null,
      age: age ?? null,
      sexe,
    })
    .select("id")
    .single();

  if (insertError) return { error: insertError.message };

  await supabase.from("history").insert({
    patient_id: (inserted as any).id,
    actor_id: user.id,
    action: "PATIENT_CREATED",
    details: { code },
  });

  revalidatePath("/app/patients");
  return { patientId: (inserted as any).id };
}

export async function deletePatient(id: string): Promise<{ error?: string }> {
  const { user, role, supabase } = await getSessionWithRole();
  if (!user) return { error: "Not authenticated." };
  if (!can(role, "patients:write")) return { error: "Not authorised." };

  const { error } = await supabase.from("patients").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/app/patients");
  return {};
}
