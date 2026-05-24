"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveLocale(locale: "en" | "fr"): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ locale }).eq("id", user.id);
  revalidatePath("/app", "layout");
}

export async function updateProfile(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const prenom = (formData.get("prenom") as string)?.trim() || null;
  const nom = (formData.get("nom") as string)?.trim() || null;
  const full_name = prenom && nom ? `${prenom} ${nom}` : (prenom ?? nom ?? null);

  const { error } = await supabase
    .from("profiles")
    .update({ prenom, nom, full_name })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/app/settings");
  return { ok: true };
}

export async function changePassword(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const currentPassword = formData.get("current_password") as string;
  const newPassword = formData.get("new_password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!currentPassword) return { error: "Current password is required." };
  if (!newPassword || newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  // Verify the current password before allowing the change
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });
  if (signInErr) return { error: "Current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return { ok: true };
}
