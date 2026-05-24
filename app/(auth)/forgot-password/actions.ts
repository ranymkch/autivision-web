"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.object({ email: z.string().email() });

export type ForgotState = { error?: string; ok?: boolean; email?: string };
export type VerifyResetState = { error?: string; success?: boolean };

export async function sendPasswordReset(
  _prev: ForgotState,
  formData: FormData
): Promise<ForgotState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: "Invalid email address." };

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { shouldCreateUser: false },
  });

  if (error) return { error: error.message };
  return { ok: true, email: parsed.data.email };
}

export async function verifyResetOtp(
  _prev: VerifyResetState,
  formData: FormData
): Promise<VerifyResetState> {
  const email = (formData.get("email") as string)?.trim();
  const token = (formData.get("token") as string)?.replace(/\s/g, "");

  if (!email || !token || !/^\d{6}$/.test(token)) {
    return { error: "Please enter a valid 6-digit code." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) return { error: error.message };
  return { success: true };
}
