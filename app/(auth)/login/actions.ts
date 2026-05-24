"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppRole } from "@/lib/rbac";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  next: z.string().optional().nullable(),
});

export type LoginState = { error?: string };

export async function signInWithPassword(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    return { error: "Please enter a valid email and password." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return { error: error.message };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication failed." };

  // Block login if email is not yet confirmed — sign out and surface a clear message.
  if (!user.email_confirmed_at) {
    await supabase.auth.signOut();
    return {
      error:
        "Please verify your email address before signing in. Check your inbox for the verification link.",
    };
  }

  const next =
    parsed.data.next && parsed.data.next.startsWith("/")
      ? parsed.data.next
      : "/app/dashboard";

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  // Treat null (column not yet migrated) as "approved" so existing accounts
  // are never accidentally locked out.
  const status = profile?.account_status ?? "approved";

  // Pending: keep the session alive so the /account-pending page can poll for
  // approval changes without requiring the user to sign in again.
  if (status === "pending") {
    redirect("/account-pending");
  }

  // Rejected: terminate the session — the user has no path forward without
  // admin intervention.
  if (status === "rejected") {
    await supabase.auth.signOut();
    redirect("/account-rejected");
  }

  let role = profile?.role as string | null | undefined;

  // Repair missing profile using signup metadata
  if (!isAppRole(role)) {
    const metaRole = user.user_metadata?.role as string | undefined;
    if (metaRole && isAppRole(metaRole)) {
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? "",
        role: metaRole,
        full_name: user.user_metadata?.full_name ?? null,
      }, { onConflict: "id" });
      role = metaRole;
    }
  }

  if (!isAppRole(role)) {
    redirect(`/setup-role?next=${encodeURIComponent(next)}`);
  }

  redirect(next);
}
