import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { PageHeader } from "@/components/app/page-header";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  const p = profile as any;
  const t = getDictionary((p?.locale ?? "fr") as Locale);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t.app.settings.title} subtitle={t.app.settings.subtitle} />
      <SettingsClient
        email={user?.email ?? ""}
        prenom={p?.prenom ?? ""}
        nom={p?.nom ?? ""}
        fullName={p?.full_name ?? ""}
        role={p?.role ?? "doctor"}
        memberSince={p?.created_at ?? ""}
      />
    </div>
  );
}
