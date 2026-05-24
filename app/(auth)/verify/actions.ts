"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const verifySchema = z.object({
  email: z.string().email(),
  token: z.string().regex(/^\d{6}$/),
  next: z.string().optional().nullable(),
});

export type VerifyState = { error?: string };

function siteOrigin() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function verifyOtp(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const parsed = verifySchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    return { error: "Invalid code." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.token,
    type: "email",
  });

  if (error) return { error: error.message };

  const next = parsed.data.next && parsed.data.next.startsWith("/")
    ? parsed.data.next
    : "/app/dashboard";
  redirect(next);
}

export async function resendOtp(email: string, next?: string | null): Promise<{ error?: string; ok?: boolean }> {
  const parsed = z.string().email().safeParse(email);
  if (!parsed.success) return { error: "Invalid email." };

  const supabase = createClient();
  const safeNext = next && next.startsWith("/") ? next : "/app/dashboard";
  const redirectTo = `${siteOrigin()}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: redirectTo,
    },
  });
  if (error) return { error: error.message };
  return { ok: true };
}
