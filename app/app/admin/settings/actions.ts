"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/rbac";

async function getAdminUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!can(profile?.role as any, "admin:manage")) return null;
  return { supabase, user };
}

export async function updateAdminProfile(
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const session = await getAdminUser();
  if (!session) return { error: "Not authorized." };
  const { supabase, user } = session;

  const prenom = (formData.get("prenom") as string)?.trim() || null;
  const nom = (formData.get("nom") as string)?.trim() || null;
  const full_name =
    prenom && nom ? `${prenom} ${nom}` : (prenom ?? nom ?? null);

  const { error } = await supabase
    .from("profiles")
    .update({ prenom, nom, full_name })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/app/admin/settings");
  return { ok: true };
}

export async function updateAdminEmail(
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const session = await getAdminUser();
  if (!session) return { error: "Not authorized." };
  const { supabase, user } = session;

  const newEmail = (formData.get("new_email") as string)?.trim().toLowerCase();
  const currentPassword = formData.get("current_password") as string;

  if (!newEmail || !/\S+@\S+\.\S+/.test(newEmail)) {
    return { error: "Please enter a valid email address." };
  }
  if (!currentPassword) {
    return { error: "Current password is required to update email." };
  }

  // Re-authenticate to confirm identity before a sensitive change
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });
  if (signInErr) return { error: "Current password is incorrect." };

  // Supabase sends a confirmation email to the new address before switching
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) return { error: error.message };

  revalidatePath("/app/admin/settings");
  return { ok: true };
}

export async function changeAdminPassword(
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  const session = await getAdminUser();
  if (!session) return { error: "Not authorized." };
  const { supabase, user } = session;

  const currentPassword = formData.get("current_password") as string;
  const newPassword = formData.get("new_password") as string;
  const confirmPassword = formData.get("confirm_password") as string;

  if (!currentPassword) return { error: "Current password is required." };
  if (!newPassword || newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  // Re-authenticate to confirm identity before a sensitive change
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });
  if (signInErr) return { error: "Current password is incorrect." };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return { ok: true };
}
