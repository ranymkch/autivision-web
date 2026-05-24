import { createClient } from "@/lib/supabase/server";
import { getDictionary, interpolate } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { PageHeader } from "@/components/app/page-header";
import { AdminUsersClient } from "./admin-users-client";

export default async function AdminUsersPage() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("locale")
    .eq("id", user!.id)
    .single();
  const t = getDictionary((profile?.locale ?? "fr") as Locale);

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, prenom, nom, email, role, account_status, email_verified, created_at")
    .neq("role", "admin")
    .order("created_at", { ascending: false });

  const users = (data ?? []) as {
    id: string;
    full_name: string | null;
    prenom: string | null;
    nom: string | null;
    email: string;
    role: string | null;
    account_status: string;
    email_verified: boolean;
    created_at: string;
  }[];

  return (
    <>
      <PageHeader
        title={t.app.admin.title}
        subtitle={interpolate(t.app.admin.registeredDoctors, { n: users.length })}
      />
      <AdminUsersClient users={users} />
    </>
  );
}
