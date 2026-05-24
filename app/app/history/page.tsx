import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppRole, can } from "@/lib/rbac";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { HistoryTable } from "./history-table";

export default async function HistoryPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, locale")
    .eq("id", user!.id)
    .single();
  const role = isAppRole(profile?.role) ? profile!.role : null;
  const isFr = profile?.locale === "fr";
  if (!can(role, "history:view")) redirect("/app/dashboard");

  const { data: entries } = await supabase
    .from("history")
    .select(`
      id, action, details, created_at,
      patients(code_anonymise),
      evaluations(niveau_risque, result_mode)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (entries ?? []) as any[];

  return (
    <>
      <PageHeader
        title={isFr ? "Historique" : "History"}
        subtitle={isFr
          ? "Journal chronologique de toutes les analyses, questionnaires et résultats combinés."
          : "Chronological log of all analyses, questionnaires, and combined results."}
      />

      <Card>
        <CardContent className="p-0">
          <HistoryTable rows={rows} />
        </CardContent>
      </Card>
    </>
  );
}
