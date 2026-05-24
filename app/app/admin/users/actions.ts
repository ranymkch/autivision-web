"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { can, isAppRole, type AppRole } from "@/lib/rbac";
import type { AccountStatus } from "@/types/database";

async function getCallerSession() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, authed: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const authed = can(profile?.role as any, "admin:manage");
  return { supabase, user, authed };
}

export async function changeRole(userId: string, role: AppRole) {
  const { supabase, authed } = await getCallerSession();
  if (!authed) return { error: "Not authorized." };
  if (!isAppRole(role)) return { error: "Invalid role." };

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/app/admin/users");
  return {};
}

async function sendStatusEmail(email: string, status: "approved" | "rejected") {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const isApproved = status === "approved";

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "AutiVision <no-reply@autivision.app>",
        to: [email],
        subject: isApproved
          ? "Votre compte AutiVision a été approuvé / Your AutiVision account has been approved"
          : "Votre compte AutiVision n'a pas été approuvé / Your AutiVision account was not approved",
        html: isApproved
          ? `
<p>Bonjour,</p>
<p>Votre compte AutiVision a été approuvé par un administrateur. Vous pouvez maintenant vous connecter à <a href="${appUrl}/login">${appUrl}/login</a>.</p>
<hr/>
<p>Hello,</p>
<p>Your AutiVision account has been approved by an administrator. You can now sign in at <a href="${appUrl}/login">${appUrl}/login</a>.</p>
`.trim()
          : `
<p>Bonjour,</p>
<p>Votre demande de compte AutiVision n'a pas été approuvée. Veuillez contacter votre administrateur pour plus d'informations.</p>
<hr/>
<p>Hello,</p>
<p>Your AutiVision account request was not approved. Please contact your administrator for more information.</p>
`.trim(),
      }),
    });
  } catch {
    // Email is best-effort — don't fail the status change if the email service is down
  }
}

export async function setAccountStatus(userId: string, status: AccountStatus) {
  const { supabase, authed } = await getCallerSession();
  if (!authed) return { error: "Not authorized." };

  const validStatuses: AccountStatus[] = ["pending", "approved", "rejected"];
  if (!validStatuses.includes(status)) return { error: "Invalid status." };

  const { error } = await supabase
    .from("profiles")
    .update({ account_status: status })
    .eq("id", userId);

  if (error) return { error: error.message };

  // Send status email best-effort
  if (status === "approved" || status === "rejected") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();
    if (profile?.email) {
      void sendStatusEmail(profile.email, status);
    }
  }

  revalidatePath("/app/admin/users");
  return {};
}

export async function deleteUser(userId: string) {
  const { user: caller, authed } = await getCallerSession();
  if (!authed) return { error: "Not authorized." };
  if (userId === caller?.id) return { error: "You cannot delete your own account." };

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e: any) {
    return { error: e.message };
  }

  // Deleting from auth.users cascades to profiles and all related data.
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/app/admin/users");
  return {};
}

export async function updateUser(
  userId: string,
  data: { prenom: string; nom: string; email: string }
) {
  const { authed } = await getCallerSession();
  if (!authed) return { error: "Not authorized." };

  const { prenom, nom, email } = data;
  if (!prenom || !nom || !email) return { error: "All fields are required." };

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e: any) {
    return { error: e.message };
  }

  const { error: authErr } = await adminClient.auth.admin.updateUserById(userId, { email });
  if (authErr) return { error: authErr.message };

  const { error: profileErr } = await adminClient
    .from("profiles")
    .update({ prenom, nom, full_name: `${prenom} ${nom}`, email })
    .eq("id", userId);

  if (profileErr) return { error: profileErr.message };

  revalidatePath("/app/admin/users");
  return {};
}

export async function createUserByAdmin(formData: FormData) {
  const { authed } = await getCallerSession();
  if (!authed) return { error: "Not authorized." };

  const full_name = formData.get("full_name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  if (!full_name || !email || !password || !isAppRole(role)) {
    return { error: "All fields are required." };
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (e: any) {
    return { error: e.message };
  }

  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });

  if (createErr || !created.user) return { error: createErr?.message ?? "User creation failed." };

  const { error: profileErr } = await adminClient
    .from("profiles")
    .upsert({
      id: created.user.id,
      email,
      full_name,
      role: role as AppRole,
      account_status: "approved",
      email_verified: true,
    }, { onConflict: "id" });

  if (profileErr) return { error: profileErr.message };

  revalidatePath("/app/admin/users");
  return {};
}
