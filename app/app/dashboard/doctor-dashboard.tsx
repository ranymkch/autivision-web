import Link from "next/link";
import { Users, Stethoscope, FileText, AlertTriangle, Plus, ArrowRight, TrendingUp, Brain } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { RiskBadge } from "@/components/app/risk-badge";
import { DashboardWelcome } from "./welcome";
import { PatientSearch } from "./patient-search";
import { formatDate } from "@/lib/utils";

export async function DoctorDashboard({ userId }: { userId: string }) {
  const supabase = createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Fetch all stats in parallel
  const [patientsRes, reportsRes, evalsRes, recentPatientsRes, userRes] = await Promise.all([
    supabase.from("patients").select("id, created_at", { count: "exact" }).eq("owner_id", userId),
    supabase.from("reports").select("id", { count: "exact", head: true }),
    supabase
      .from("evaluations")
      .select("id, niveau_risque, score_image, ml_prediction, created_at, result_mode", { count: "exact" })
      .eq("owner_id", userId),
    supabase
      .from("patients")
      .select("id, code_anonymise, name, photo_url, age, sexe, created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("profiles").select("full_name, prenom, nom, locale").eq("id", userId).single(),
  ]);

  const patients = patientsRes.data ?? [];
  const patientsCount = patientsRes.count ?? 0;
  const reportsCount = reportsRes.count ?? 0;
  const evals = evalsRes.data ?? [];
  const evaluationsCount = evalsRes.count ?? 0;
  const recentPatients = recentPatientsRes.data ?? [];

  const highRiskMonth = evals.filter(
    (e) => e.niveau_risque === "ELEVE" && new Date(e.created_at) >= startOfMonth
  ).length;

  // AI prediction distribution
  const autisticCount = evals.filter((e) => e.ml_prediction === "autistic").length;
  const nonAutisticCount = evals.filter((e) => e.ml_prediction === "non_autistic").length;
  const totalPredictions = autisticCount + nonAutisticCount;

  // Risk distribution
  const riskCounts = {
    ELEVE: evals.filter((e) => e.niveau_risque === "ELEVE").length,
    MODERE: evals.filter((e) => e.niveau_risque === "MODERE").length,
    FAIBLE: evals.filter((e) => e.niveau_risque === "FAIBLE").length,
  };

  // Monthly patients (last 6 months)
  const monthlyData = getMonthlyData(patients.map((p) => p.created_at));

  // Age distribution from patients with evaluations
  const { data: patientsWithAge } = await supabase
    .from("patients")
    .select("age, sexe")
    .eq("owner_id", userId)
    .not("age", "is", null);

  const ageGroups = buildAgeGroups(patientsWithAge ?? []);
  const genderCount = { M: 0, F: 0, AUTRE: 0 };
  for (const p of patientsWithAge ?? []) {
    if (p.sexe in genderCount) genderCount[p.sexe as keyof typeof genderCount]++;
  }

  const profile = userRes.data;
  const isFr = profile?.locale === "fr";
  const displayName = profile?.prenom && profile?.nom
    ? `${profile.prenom} ${profile.nom}`
    : (profile?.full_name ?? null);

  return (
    <>
      <DashboardWelcome email={displayName} />

      <PageHeader
        title={isFr ? "Tableau de bord" : "Dashboard"}
        actions={
          <Button asChild>
            <Link href="/app/screening">
              <Plus /> {isFr ? "Nouveau dépistage" : "New screening"}
            </Link>
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label={isFr ? "Patients" : "Patients"}    value={patientsCount}   icon={Users} />
        <StatCard label={isFr ? "Dépistages" : "Screenings"} value={evaluationsCount} icon={Stethoscope} />
        <StatCard label={isFr ? "Rapports" : "Reports"}     value={reportsCount}    icon={FileText} />
        <StatCard label={isFr ? "Risque élevé" : "High-risk"} value={highRiskMonth} icon={AlertTriangle} hint={isFr ? "ce mois" : "this month"} />
      </div>

      {/* Charts row */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* AI prediction distribution */}
        {totalPredictions > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Brain className="h-4 w-4 text-primary" />
                {isFr ? "Distribution des prédictions IA" : "AI Prediction Distribution"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <BarItem
                label={isFr ? "Autistique" : "Autistic"}
                value={autisticCount}
                total={totalPredictions}
                color="bg-red-400"
              />
              <BarItem
                label={isFr ? "Non autistique" : "Non-autistic"}
                value={nonAutisticCount}
                total={totalPredictions}
                color="bg-green-400"
              />
            </CardContent>
          </Card>
        )}

        {/* Risk distribution */}
        {evaluationsCount > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <AlertTriangle className="h-4 w-4 text-primary" />
                {isFr ? "Distribution du niveau de risque" : "Risk Tier Distribution"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <BarItem label={isFr ? "Élevé" : "High"}     value={riskCounts.ELEVE}  total={evaluationsCount} color="bg-red-400" />
              <BarItem label={isFr ? "Modéré" : "Moderate"} value={riskCounts.MODERE} total={evaluationsCount} color="bg-amber-400" />
              <BarItem label={isFr ? "Faible" : "Low"}      value={riskCounts.FAIBLE} total={evaluationsCount} color="bg-green-400" />
            </CardContent>
          </Card>
        )}

        {/* Monthly patients */}
        {patientsCount > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" />
                {isFr ? "Patients ajoutés par mois" : "Patients Added per Month"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 h-24">
                {monthlyData.map((m) => (
                  <div key={m.label} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-mono text-muted-foreground">{m.count}</span>
                    <div
                      className="w-full rounded-t bg-primary/70 min-h-[4px]"
                      style={{ height: `${Math.max(4, (m.count / (Math.max(...monthlyData.map((x) => x.count)) || 1)) * 80)}px` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{m.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gender distribution */}
        {(patientsWithAge?.length ?? 0) > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Users className="h-4 w-4 text-primary" />
                {isFr ? "Distribution par sexe" : "Gender Distribution"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <BarItem label={isFr ? "Masculin" : "Male"}   value={genderCount.M}     total={patientsWithAge!.length} color="bg-blue-400" />
              <BarItem label={isFr ? "Féminin" : "Female"}  value={genderCount.F}     total={patientsWithAge!.length} color="bg-pink-400" />
              <BarItem label={isFr ? "Autre" : "Other"}     value={genderCount.AUTRE} total={patientsWithAge!.length} color="bg-purple-400" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent patients */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="font-display text-lg font-bold shrink-0">{isFr ? "Patients récents" : "Recent patients"}</h2>
            <PatientSearch />
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link href="/app/patients">{isFr ? "Voir tout" : "View all"} <ArrowRight /></Link>
            </Button>
          </div>

          {recentPatients.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {recentPatients.map((p) => (
                <Link
                  key={p.id}
                  href={`/app/patients/${p.id}`}
                  className="group rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-secondary/40"
                >
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-border bg-secondary">
                      {p.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-mono text-muted-foreground">
                          {((p.name ?? p.code_anonymise) as string).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    {p.name && <p className="text-sm font-semibold truncate w-full">{p.name}</p>}
                    <p className="font-mono text-[10px] text-muted-foreground">{p.code_anonymise}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">{isFr ? "Aucun patient pour le moment — créez le premier pour commencer." : "No patients yet — create your first to get started."}</p>
              <Button asChild size="sm">
                <Link href="/app/patients/new">{isFr ? "Nouveau patient" : "New patient"}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function BarItem({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono text-xs font-semibold">{value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function getMonthlyData(dates: string[]): { label: string; count: number }[] {
  const now = new Date();
  const months: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleString("default", { month: "short" });
    const count = dates.filter((dt) => {
      const date = new Date(dt);
      return date.getFullYear() === d.getFullYear() && date.getMonth() === d.getMonth();
    }).length;
    months.push({ label, count });
  }
  return months;
}

function buildAgeGroups(patients: { age: number | null }[]): { label: string; count: number }[] {
  const groups = [
    { label: "0-3", min: 0, max: 3 },
    { label: "4-6", min: 4, max: 6 },
    { label: "7-10", min: 7, max: 10 },
    { label: "11+", min: 11, max: 100 },
  ];
  return groups.map((g) => ({
    label: g.label,
    count: patients.filter((p) => p.age != null && p.age >= g.min && p.age <= g.max).length,
  }));
}
