"use server";

import { isAppRole } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";

export type VerifyState = { error?: string; success?: boolean };

export async function verifyEmailOtp(
  _prev: VerifyState,
  formData: FormData
): Promise<VerifyState> {
  const email = (formData.get("email") as string)?.trim();
  const token = (formData.get("token") as string)?.replace(/\s/g, "");

  if (!email || !token || !/^\d{6}$/.test(token)) {
    return { error: "Veuillez saisir un code valide à 6 chiffres." };
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });

    if (error) return { error: error.message };

    if (data.user) {
      const meta = data.user.user_metadata ?? {};
      const role = meta.role as string | undefined;
      await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          email: data.user.email,
          role: isAppRole(role) ? role : null,
          full_name: meta.full_name ?? null,
          prenom: meta.prenom ?? null,
          nom: meta.nom ?? null,
          numero_serie: meta.numero_serie ?? null,
          account_status: "pending",
          email_verified: true,
        },
        { onConflict: "id" }
      );
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Une erreur inattendue s'est produite.";
    return { error: message };
  }
}
