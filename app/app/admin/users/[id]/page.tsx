import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Users, Activity, ClipboardList, Calendar, Mail, Stethoscope } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { can, isAppRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { RiskBadge } from "@/components/app/risk-badge";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

export default async function AdminDoctorProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const db = createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: callerProfile } = await db
    .from("profiles")
    .select("role, locale")
    .eq("id", user.id)
    .single();
  if (!can(isAppRole(callerProfile?.role) ? callerProfile!.role : null, "admin:manage")) {
    redirect("/app/dashboard");
  }
  const t = getDictionary((callerProfile?.locale ?? "fr") as Locale);
  const locale = callerProfile?.locale ?? "fr";

  // Fetch doctor profile
  const { data: doctorProfile, error } = await db
    .from("profiles")
    .select("id, full_name, prenom, nom, email, role, account_status, created_at, locale")
    .eq("id", params.id)
    .single();

  if (error || !doctorProfile) notFound();

  const dp = doctorProfile as any;
  const doctorName = dp.prenom && dp.nom
    ? `${dp.prenom} ${dp.nom}`
    : (dp.full_name ?? dp.email);

  // Fetch doctor's patients — no name or photo (admin must not see patient identity)
  const { data: patientsData } = await db
    .from("patients")
    .select("id, code_anonymise, age, sexe, created_at")
    .eq("owner_id", params.id)
    .order("created_at", { ascending: false });

  const patients = patientsData ?? [];

  // Fetch evaluation stats for this doctor's patients
  const patientIds = patients.map((p) => p.id);
  let evalCount = 0;
  let questionnaireCount = 0;
  let evalsPerPatient: Record<string, { niveau_risque: string | null; created_at: string }> = {};

  if (patientIds.length > 0) {
    const { count: evCount } = await db
      .from("evaluations")
      .select("id", { count: "exact", head: true })
      .in("patient_id", patientIds);
    evalCount = evCount ?? 0;

    const { count: qCount } = await db
      .from("evaluations")
      .select("id", { count: "exact", head: true })
      .in("patient_id", patientIds)
      .not("score_questionnaire", "is", null);
    questionnaireCount = qCount ?? 0;

    // Latest evaluation per patient (for risk display)
    const { data: evRows } = await db
      .from("evaluations")
      .select("patient_id, niveau_risque, created_at")
      .in("patient_id", patientIds)
      .order("created_at", { ascending: false });

    for (const ev of evRows ?? []) {
      if (!evalsPerPatient[ev.patient_id]) {
        evalsPerPatient[ev.patient_id] = { niveau_risque: ev.niveau_risque, created_at: ev.created_at };
      }
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/app/admin/users">
          <ArrowLeft /> {t.app.admin.backToDoctors}
        </Link>
      </Button>

      <PageHeader
        title={doctorName}
        subtitle={locale === "fr"
          ? `Profil médecin · inscrit le ${new Date(dp.created_at).toLocaleDateString("fr-FR")}`
          : `Doctor profile · joined ${new Date(dp.created_at).toLocaleDateString()}`}
      />

      {/* Doctor info card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-primary/10 text-primary">
              <Stethoscope className="h-8 w-8" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="font-display text-xl font-semibold">{doctorName}</p>
                <span className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  STATUS_STYLES[dp.account_status] ?? "bg-secondary text-muted-foreground"
                )}>
                  {(t.app.admin.status as Record<string, string>)[dp.account_status] ?? dp.account_status}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {dp.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> {t.app.admin.doctorJoined} {formatDate(dp.created_at)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{patients.length}</p>
              <p className="text-xs text-muted-foreground">{t.app.patients.title}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{evalCount}</p>
              <p className="text-xs text-muted-foreground">{t.app.admin.aiScreenings}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{questionnaireCount}</p>
              <p className="text-xs text-muted-foreground">{t.app.nav.questionnaire}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Patients list */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border px-6 py-4">
            <h2 className="flex items-center gap-2 font-display text-base font-semibold">
              <Users className="h-4 w-4 text-primary" /> {t.app.patients.title}
            </h2>
          </div>
          {patients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-medium">{t.app.patients.table.code}</th>
                    <th className="px-5 py-3 font-medium">{t.app.patients.table.age}</th>
                    <th className="px-5 py-3 font-medium">{t.app.patients.table.sex}</th>
                    <th className="px-5 py-3 font-medium">{locale === "fr" ? "Évaluation" : "Evaluation"}</th>
                    <th className="px-5 py-3 font-medium">{t.app.patients.table.created}</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p: any) => {
                    const latestEval = evalsPerPatient[p.id] ?? null;
                    return (
                      <tr key={p.id} className="border-b border-border/60 last:border-0">
                        <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{p.code_anonymise}</td>
                        <td className="px-5 py-3">{p.age ?? "—"}</td>
                        <td className="px-5 py-3 uppercase text-muted-foreground text-xs">{p.sexe}</td>
                        <td className="px-5 py-3">
                          {latestEval
                            ? <RiskBadge risk={latestEval.niveau_risque as any} />
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground text-xs">{formatDate(p.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {t.app.admin.noPatientsYet}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
