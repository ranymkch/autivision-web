import Link from "next/link";
import {
  Users, Clock, ArrowRight, Activity,
  FileText, ClipboardList, ScanFace, BarChart3, TrendingUp
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

const RISK_STYLES: Record<string, string> = {
  FAIBLE: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  MODERE: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  ELEVE:  "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

export async function AdminDashboard() {
  // Use regular client only to identify the current admin user (session-bound).
  // All platform-wide data queries use the admin client (service role) to bypass RLS,
  // because doctors' evaluations/reports/questionnaires are owner-scoped by policy.
  const supabase = createClient();
  const db = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: adminProfile } = await db
    .from("profiles")
    .select("locale")
    .eq("id", user!.id)
    .single();
  const isFr = adminProfile?.locale === "fr";

  // Compute "this month" window server-side for the monthly screenings stat
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [
    profilesRes,
    patientsRes,
    evalsRes,
    questionnairesRes,
    reportsRes,
    recentUsersRes,
    recentEvalsRes,
    monthlyEvalsRes,
  ] = await Promise.all([
    db.from("profiles").select("id, full_name, prenom, nom, role, account_status, created_at").neq("role", "admin"),
    db.from("patients").select("id", { count: "exact", head: true }),
    // Only fetch the fields needed for risk distribution — no heavy date bucketing
    db.from("evaluations").select("id, result_mode, niveau_risque").order("id", { ascending: false }),
    db.from("questionnaires").select("id", { count: "exact", head: true }),
    db.from("reports").select("id", { count: "exact", head: true }),
    db
      .from("profiles")
      .select("id, full_name, prenom, nom, email, role, account_status, created_at")
      .neq("role", "admin")
      .order("created_at", { ascending: false })
      .limit(3),
    db
      .from("evaluations")
      .select("id, created_at, niveau_risque, result_mode, patients(code_anonymise)")
      .order("created_at", { ascending: false })
      .limit(3),
    // Lightweight: count-only query for this month's screenings
    db.from("evaluations").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
  ]);

  const allProfiles = profilesRes.data ?? [];
  const pendingCount = allProfiles.filter((u) => u.account_status === "pending").length;
  const doctorsCount = allProfiles.filter((u) => u.role === "doctor").length;
  const patientsCount = patientsRes.count ?? 0;
  const allEvals = evalsRes.data ?? [];
  const evalsCount = allEvals.length;
  const iaScreeningsCount = allEvals.filter((e) => e.result_mode === "ai" || e.result_mode === "combined").length;
  const questionnairesCount = questionnairesRes.count ?? 0;
  const reportsCount = reportsRes.count ?? 0;
  const recentUsers = recentUsersRes.data ?? [];
  const recentEvals = recentEvalsRes.data ?? [];
  const monthlyScreenings = monthlyEvalsRes.count ?? 0;

  // Risk distribution (computed from already-fetched data)
  const riskCounts = { FAIBLE: 0, MODERE: 0, ELEVE: 0 };
  for (const e of allEvals) {
    const r = e.niveau_risque as string | null;
    if (r === "FAIBLE" || r === "MODERE" || r === "ELEVE") riskCounts[r]++;
  }

  const RISK_LABELS = isFr
    ? { FAIBLE: "Faible", MODERE: "Modéré", ELEVE: "Élevé" }
    : { FAIBLE: "Low", MODERE: "Moderate", ELEVE: "High" };

  const STATUS_LABELS_I18N: Record<string, string> = isFr
    ? { pending: "En attente", approved: "Approuvé", rejected: "Rejeté" }
    : { pending: "Pending", approved: "Approved", rejected: "Rejected" };

  const RESULT_MODE_LABELS: Record<string, string> = isFr
    ? { ai: "IA seule", questionnaire: "Questionnaire", combined: "Combiné" }
    : { ai: "AI only", questionnaire: "Questionnaire", combined: "Combined" };

  return (
    <>
      <PageHeader
        title={isFr ? "Tableau de bord admin" : "Admin Dashboard"}
        actions={
          <Button asChild>
            <Link href="/app/admin/users">
              <Users /> {isFr ? "Gérer les médecins" : "Manage Doctors"}
            </Link>
          </Button>
        }
      />

      {/* Pending banner */}
      {pendingCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/20">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          <span className="font-medium text-amber-700 dark:text-amber-400">
            {isFr
              ? `${pendingCount} compte${pendingCount !== 1 ? "s" : ""} en attente d'approbation`
              : `${pendingCount} account${pendingCount !== 1 ? "s" : ""} awaiting approval`}
          </span>
          <Button asChild variant="link" size="sm" className="ml-auto text-amber-700 dark:text-amber-400 p-0 h-auto">
            <Link href="/app/admin/users">{isFr ? "Gérer" : "Review"}</Link>
          </Button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard label={isFr ? "Médecins" : "Total Doctors"}          value={doctorsCount}        icon={Users} />
        <StatCard label={isFr ? "En attente" : "Pending"}              value={pendingCount}        icon={Clock} hint={isFr ? "en attente d'approbation" : "awaiting approval"} />
        <StatCard label={isFr ? "Patients" : "Patients"}               value={patientsCount}       icon={Users} />
        <StatCard label={isFr ? "Dépistages IA" : "IA Screenings"}     value={iaScreeningsCount}   icon={ScanFace} />
        <StatCard label={isFr ? "Questionnaires" : "Questionnaires"}   value={questionnairesCount} icon={ClipboardList} />
        <StatCard label={isFr ? "Ce mois" : "This month"}              value={monthlyScreenings}   icon={TrendingUp} hint={isFr ? "dépistages" : "screenings"} />
        <StatCard label={isFr ? "Total dépistages" : "Total screenings"} value={evalsCount}        icon={Activity} />
        <StatCard label={isFr ? "Rapports générés" : "Reports generated"} value={reportsCount}    icon={FileText} />
      </div>

      {/* Risk distribution chart */}
      <div className="mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <BarChart3 className="h-4 w-4 text-primary" /> {isFr ? "Distribution du risque" : "Risk Distribution"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["FAIBLE", "MODERE", "ELEVE"] as const).map((tier) => {
              const count = riskCounts[tier];
              const pct = evalsCount > 0 ? Math.round((count / evalsCount) * 100) : 0;
              const barColors: Record<string, string> = {
                FAIBLE: "bg-green-500",
                MODERE: "bg-amber-500",
                ELEVE:  "bg-red-500",
              };
              return (
                <div key={tier} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{RISK_LABELS[tier]}</span>
                    <span className="font-mono text-xs font-semibold">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn("h-full rounded-full transition-all", barColors[tier])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {evalsCount === 0 && (
              <p className="text-sm text-muted-foreground">{isFr ? "Aucun dépistage pour le moment." : "No screenings yet."}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent screenings */}
      {recentEvals.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{isFr ? "Dépistages récents" : "Recent Screenings"}</h2>
              <Button asChild variant="ghost" size="sm">
                <Link href="/app/admin/history">{isFr ? "Voir tout" : "View all"} <ArrowRight className="h-3 w-3" /></Link>
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-2 font-medium">{isFr ? "Patient" : "Patient"}</th>
                    <th className="px-2 py-2 font-medium">{isFr ? "Mode" : "Mode"}</th>
                    <th className="px-2 py-2 font-medium">{isFr ? "Risque" : "Risk"}</th>
                    <th className="px-2 py-2 font-medium">{isFr ? "Date" : "Date"}</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentEvals as any[]).map((e) => (
                    <tr key={e.id} className="border-b border-border/60 last:border-0">
                      <td className="px-2 py-3 font-mono text-xs font-semibold">
                        {e.patients?.code_anonymise ?? "—"}
                      </td>
                      <td className="px-2 py-3 text-xs text-muted-foreground">
                        {e.result_mode ? (RESULT_MODE_LABELS[e.result_mode] ?? e.result_mode) : "—"}
                      </td>
                      <td className="px-2 py-3">
                        {e.niveau_risque ? (
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            RISK_STYLES[e.niveau_risque] ?? "bg-secondary text-muted-foreground"
                          )}>
                            {RISK_LABELS[e.niveau_risque as keyof typeof RISK_LABELS] ?? e.niveau_risque}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-2 py-3 text-muted-foreground text-xs">{formatDate(e.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent registrations */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">{isFr ? "Inscriptions récentes" : "Recent Doctor Registrations"}</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/app/admin/users">{isFr ? "Voir tout" : "View all"} <ArrowRight className="h-3 w-3" /></Link>
            </Button>
          </div>
          {recentUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-2 font-medium">{isFr ? "Nom" : "Name"}</th>
                    <th className="px-2 py-2 font-medium">{isFr ? "Email" : "Email"}</th>
                    <th className="px-2 py-2 font-medium">{isFr ? "Statut" : "Status"}</th>
                    <th className="px-2 py-2 font-medium">{isFr ? "Inscrit le" : "Joined"}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u) => {
                    const name = u.prenom && u.nom
                      ? `${u.prenom} ${u.nom}`
                      : (u.full_name ?? "—");
                    return (
                      <tr key={u.id} className="border-b border-border/60 last:border-0">
                        <td className="px-2 py-3 font-medium">{name}</td>
                        <td className="px-2 py-3 text-muted-foreground text-xs">{(u as any).email ?? "—"}</td>
                        <td className="px-2 py-3">
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            STATUS_STYLES[u.account_status] ?? "bg-secondary text-muted-foreground"
                          )}>
                            {STATUS_LABELS_I18N[u.account_status] ?? u.account_status}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-muted-foreground text-xs">{formatDate(u.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">{isFr ? "Aucun utilisateur pour le moment." : "No users yet."}</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
