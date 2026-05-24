import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, LayoutDashboard, User } from "lucide-react";
// PrintButton and PDF route removed — reports open directly

import { createClient } from "@/lib/supabase/server";
import { isAppRole, type AppRole } from "@/lib/rbac";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { ReportRenderer } from "@/components/report/report-renderer";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import type { ScreeningReport } from "@/types/report";

const TITLES: Record<string, { en: string; fr: string }> = {
  ai:            { en: "AI screening report",            fr: "Rapport de dépistage IA" },
  face:          { en: "AI screening report",            fr: "Rapport de dépistage IA" },
  questionnaire: { en: "Questionnaire screening report", fr: "Rapport questionnaire AQ-10" },
  combined:      { en: "Combined screening report",      fr: "Rapport de dépistage combiné" },
};

export default async function ReportPage({ params }: { params: { reportId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/report/${params.reportId}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, prenom, nom")
    .eq("id", user.id)
    .single();
  const role = isAppRole(profile?.role) ? (profile!.role as AppRole) : null;

  const { data, error } = await supabase
    .from("reports")
    .select("id, evaluation_id, content, report_type, generated_at")
    .eq("id", params.reportId)
    .single();
  if (error || !data) notFound();

  const row = data as any;
  const report = row.content as ScreeningReport | null;
  const reportType = (report?.header.reportType ?? row.report_type ?? "ai") as string;
  const locale = (report?.header?.locale ?? "en") as "en" | "fr";
  const isFr = locale === "fr";
  const titleEntry = TITLES[reportType] ?? { en: "Screening report", fr: "Rapport de dépistage" };
  const title = isFr ? titleEntry.fr : titleEntry.en;

  // Fetch patient info for the report header
  let patientInfo: { name: string | null; photo_url: string | null; age: number | null; sexe: string | null } | null = null;
  let patientId: string | null = null;
  if (row.evaluation_id) {
    const { data: evData } = await supabase
      .from("evaluations")
      .select("patient_id")
      .eq("id", row.evaluation_id)
      .single();
    if (evData?.patient_id) {
      patientId = evData.patient_id;
      const { data: pt } = await supabase
        .from("patients")
        .select("name, photo_url, age, sexe")
        .eq("id", evData.patient_id)
        .single();
      patientInfo = pt ?? null;
    }
  }

  // Doctor info
  const pf = profile as any;
  const doctorName = pf?.prenom && pf?.nom
    ? `${pf.prenom} ${pf.nom}`
    : (pf?.full_name ?? null);

  const username = doctorName ?? user.email ?? null;

  return (
    <AuthProvider value={{ isAuthenticated: true, email: user.email ?? null, username, role }}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-6 py-8 md:px-10 md:py-10">
            <div className="mx-auto max-w-5xl">
              <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
                <Link href="/app/dashboard">
                  <ArrowLeft /> {isFr ? "Tableau de bord" : "Dashboard"}
                </Link>
              </Button>

              <PageHeader
                title={title}
                subtitle={
                  report
                    ? `${report.header.patientCode} · ${new Date(report.header.evaluationDate).toLocaleDateString(locale)}`
                    : undefined
                }
                actions={
                  <div className="flex gap-2">
                    {patientId && (
                      <Button asChild variant="outline">
                        <Link href={`/app/patients/${patientId}`}>
                          <User className="h-4 w-4" />
                          {isFr ? "Fiche patient" : "Patient profile"}
                        </Link>
                      </Button>
                    )}
                    <Button asChild variant="ghost">
                      <Link href="/app/dashboard">
                        <LayoutDashboard /> {isFr ? "Tableau de bord" : "Dashboard"}
                      </Link>
                    </Button>
                  </div>
                }
              />

              {report ? (
                <div id="report-print-area">
                  <ReportRenderer
                    report={report}
                    patientPhoto={patientInfo?.photo_url ?? null}
                    patientName={patientInfo?.name ?? null}
                    doctorName={doctorName}
                  />
                </div>
              ) : (
                <Card>
                  <CardContent className="space-y-2 p-6 text-sm">
                    <p className="font-medium">Report content unavailable.</p>
                    <p className="text-muted-foreground">
                      This report was created without structured content. Re-generate it from
                      the screening or questionnaire flow.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
