import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { can } from "@/lib/rbac";
import { PageHeader } from "@/components/app/page-header";
import { AdminSettingsClient } from "./settings-client";

export default async function AdminSettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const p = profile as any;

  if (!can(p?.role, "admin:manage")) redirect("/app/dashboard");

  const t = getDictionary((p?.locale ?? "fr") as Locale);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title={t.app.settings.adminTitle}
        subtitle={t.app.settings.adminSubtitle}
      />
      <AdminSettingsClient
        email={user.email ?? ""}
        prenom={p?.prenom ?? ""}
        nom={p?.nom ?? ""}
        fullName={p?.full_name ?? ""}
        memberSince={p?.created_at ?? ""}
      />
    </div>
  );
}
