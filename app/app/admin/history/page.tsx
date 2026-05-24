import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { HistoryTable } from "../../history/history-table";

export default async function AdminHistoryPage() {
  const supabase = createClient();
  const db = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await db
    .from("profiles")
    .select("locale")
    .eq("id", user!.id)
    .single();
  const t = getDictionary((profile?.locale ?? "fr") as Locale);

  const { data: entries } = await db
    .from("history")
    .select(`
      id, action, details, created_at,
      patients(code_anonymise),
      evaluations(niveau_risque, result_mode),
      profiles!actor_id(prenom, nom, full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (entries ?? []) as any[];

  return (
    <>
      <PageHeader
        title={t.app.history.title}
        subtitle={t.app.history.adminSubtitle}
      />

      <Card>
        <CardContent className="p-0">
          <HistoryTable rows={rows} showDoctor />
        </CardContent>
      </Card>
    </>
  );
}
