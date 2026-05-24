"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  prenom: z.string().min(1, "First name is required."),
  nom: z.string().min(1, "Last name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["doctor"], { required_error: "Please select a role." }),
  numero_serie: z.string().optional().nullable(),
});

export type SignupState = { error?: string };

function siteOrigin() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function signUp(
  _prev: SignupState,
  formData: FormData
): Promise<SignupState> {
  const parsed = schema.safeParse({
    prenom: (formData.get("prenom") as string)?.trim(),
    nom: (formData.get("nom") as string)?.trim(),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    numero_serie: (formData.get("numero_serie") as string)?.trim() || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const fullName = `${parsed.data.prenom} ${parsed.data.nom}`.trim();

  const supabase = createClient();
  const redirectTo = `${siteOrigin()}/auth/callback?next=/account-pending`;

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: fullName,
        prenom: parsed.data.prenom,
        nom: parsed.data.nom,
        role: parsed.data.role,
        numero_serie: parsed.data.numero_serie ?? null,
      },
      emailRedirectTo: redirectTo,
    },
  });

  if (error) return { error: error.message };

  if (data.session) {
    // Supabase auto-confirmed the email (e.g. disabled email confirmation in project settings).
    // Insert the profile and move straight to the pending-approval page.
    await supabase.from("profiles").upsert({
      id: data.user!.id,
      email: parsed.data.email,
      role: parsed.data.role,
      full_name: fullName,
      prenom: parsed.data.prenom,
      nom: parsed.data.nom,
      numero_serie: parsed.data.numero_serie ?? null,
      account_status: "pending",
      email_verified: true,
    }, { onConflict: "id" });
    redirect("/account-pending");
  }

  // Normal path: Supabase sent a verification email. Redirect to the
  // dedicated verify-email screen so the user knows what to do next.
  const verifyUrl = `/verify-email?email=${encodeURIComponent(parsed.data.email)}`;
  redirect(verifyUrl);
}
