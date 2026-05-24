import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Plus, ArrowRight, FileText, ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAppRole, can } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { RiskBadge } from "@/components/app/risk-badge";
import { formatDate } from "@/lib/utils";
import { PatientReportActions } from "./report-actions";
import { PatientAvatar } from "./patient-avatar";
import { PatientActionsClient, PatientDeleteButton } from "./patient-actions-client";
import { ClinicalNotesClient } from "./clinical-notes-client";

const REPORT_TYPE_LABELS: Record<string, { en: string; fr: string }> = {
  ai:           { en: "AI Report",            fr: "Rapport IA" },
  face:         { en: "AI Report",            fr: "Rapport IA" },
  questionnaire:{ en: "Questionnaire Report", fr: "Rapport questionnaire" },
  combined:     { en: "Combined Report",      fr: "Rapport combiné" },
};

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, locale")
    .eq("id", user!.id)
    .single();
  const role = isAppRole(profile?.role) ? profile!.role : null;
  const isFr = profile?.locale === "fr";
  const showIdentity = can(role, "patients:viewIdentity");
  const canScreen = can(role, "screening:run");
  const canQuestionnaire = can(role, "questionnaire:run");
  const canGenerate = can(role, "reports:generate");
  const canViewReports = can(role, "reports:view");
  const canWrite = can(role, "patients:write");
  const isAdmin = role === "admin";

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", params.id)
    .single();
  if (!patient) notFound();

  const p = patient as any;

  const [reportsRes, evaluationsRes] = await Promise.all([
    supabase
      .from("reports")
      .select(`
        id, generated_at, report_type, evaluation_id,
        evaluations!inner(patient_id, niveau_risque, score_global, ml_prediction, ml_confidence)
      `)
      .eq("evaluations.patient_id", params.id)
      .order("generated_at", { ascending: false }),
    supabase
      .from("evaluations")
      .select("id, created_at, niveau_risque, score_global, score_image, score_questionnaire, statut, result_mode")
      .eq("patient_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  const reports = reportsRes.data ?? [];
  const evaluations = (evaluationsRes.data ?? []) as {
    id: string;
    created_at: string;
    niveau_risque: string | null;
    score_global: number | null;
    score_image: number | null;
    score_questionnaire: number | null;
    statut: string;
    result_mode: string | null;
  }[];

  const hasScreening = evaluations.some((e) => e.score_image != null);
  const hasQuestionnaire = evaluations.some((e) => e.score_questionnaire != null);
  const pageTitle = showIdentity ? (p.name ?? p.code_anonymise) : p.code_anonymise;
  const pageSubtitle = showIdentity
    ? `${p.code_anonymise} · Age ${p.age ?? "—"} · ${p.sexe}`
    : `Age ${p.age ?? "—"} · ${p.sexe}`;

  const photoUrl = p.photo_url as string | null;
  const lastEval = evaluations[0] ?? null;

  // Report summaries for PatientReportActions
  const reportSummaries = (reports as any[]).map((r) => ({
    id: r.id,
    report_type: r.report_type as string,
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href={isAdmin ? "/app/admin/history" : "/app/patients"}>
          <ArrowLeft /> {isAdmin ? "History" : "Patients"}
        </Link>
      </Button>

      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
          <div className="flex flex-wrap gap-2">
            {canScreen && (
              <Button asChild>
                <Link href={`/app/screening?patient=${p.id}`}>
                  <Plus /> {isFr
                    ? (hasScreening ? "Refaire le dépistage" : "Nouveau dépistage")
                    : (hasScreening ? "Redo screening" : "New screening")}
                </Link>
              </Button>
            )}
            {canQuestionnaire && (
              <Button asChild variant="outline">
                <Link href={`/questionnaire/${p.id}${lastEval ? `?evaluation=${lastEval.id}` : ""}`}>
                  <ClipboardList /> {hasQuestionnaire ? (isFr ? "Refaire le questionnaire" : "Retake questionnaire") : (isFr ? "Nouveau questionnaire" : "New questionnaire")}
                </Link>
              </Button>
            )}
          </div>
        }
      />

      {/* Identity card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {showIdentity ? (
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <PatientAvatar photoUrl={photoUrl} name={p.name ?? p.code_anonymise} />
                <div>
                  <p className="font-display text-xl font-semibold">{p.name ?? p.code_anonymise}</p>
                  <p className="text-xs font-mono text-muted-foreground">{p.code_anonymise}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Age {p.age ?? "—"} · {p.sexe}
                  </p>
                </div>
              </div>
              {canWrite && (
                <PatientActionsClient
                  patientId={params.id}
                  initialName={p.name}
                  initialAge={p.age}
                  initialSexe={p.sexe}
                  initialPhotoUrl={p.photo_url}
                />
              )}
            </div>
          ) : (
            <div>
              <p className="font-mono text-xl font-semibold">{p.code_anonymise}</p>
              <p className="mt-1 text-xs text-muted-foreground">Age {p.age ?? "—"} · {p.sexe}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clinical notes — doctors only, full CRUD */}
      {canWrite && (
        <ClinicalNotesClient
          patientId={params.id}
          initialNotes={p.notes ?? null}
        />
      )}

      {/* Report generation actions — doctor only, with recommendations */}
      {canGenerate && evaluations.length > 0 && (
        <PatientReportActions
          patientId={params.id}
          evaluations={evaluations}
          reports={reportSummaries}
          locale={(profile?.locale ?? "fr") as "en" | "fr"}
        />
      )}

      {/* Reports */}
      {canViewReports && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
              <FileText className="h-4 w-4 text-primary" /> {isFr ? "Rapports" : "Reports"}
            </h2>
            {reports.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-2 py-2 font-medium">{isFr ? "Date" : "Date"}</th>
                      <th className="px-2 py-2 font-medium">{isFr ? "Type" : "Type"}</th>
                      <th className="px-2 py-2 font-medium">{isFr ? "Risque" : "Risk"}</th>
                      {!isAdmin && <th className="px-2 py-2" />}
                    </tr>
                  </thead>
                  <tbody>
                    {(reports as any[]).map((r) => {
                      const ev = r.evaluations;
                      const typeLabel = REPORT_TYPE_LABELS[r.report_type] ?? { en: r.report_type, fr: r.report_type };
                      return (
                        <tr key={r.id} className="border-b border-border/60 last:border-0">
                          <td className="px-2 py-3 text-muted-foreground">{formatDate(r.generated_at)}</td>
                          <td className="px-2 py-3 text-xs font-semibold">
                            {isFr ? typeLabel.fr : typeLabel.en}
                          </td>
                          <td className="px-2 py-3">
                            <RiskBadge risk={ev?.niveau_risque ?? null} />
                          </td>
                          {!isAdmin && (
                            <td className="px-2 py-3 text-right">
                              <Button asChild variant="ghost" size="sm">
                                <Link href={`/report/${r.id}`}>
                                  {isFr ? "Voir" : "View"} <ArrowRight className="h-3 w-3" />
                                </Link>
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {isFr ? "Aucun rapport pour le moment." : "No reports yet."}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Evaluations — doctor only */}
      {canScreen && (
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 font-display text-lg font-semibold">
              {isFr ? "Dépistages" : "Screenings"}
            </h2>
            {evaluations.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-2 py-2 font-medium">{isFr ? "Date" : "Date"}</th>
                    <th className="px-2 py-2 font-medium">{isFr ? "Score" : "Score"}</th>
                    <th className="px-2 py-2 font-medium">{isFr ? "Risque" : "Risk"}</th>
                    <th className="px-2 py-2 font-medium">{isFr ? "Mode" : "Mode"}</th>
                    <th className="px-2 py-2 font-medium">IA</th>
                    <th className="px-2 py-2 font-medium">AQ-10</th>
                    <th className="px-2 py-2 font-medium">{isFr ? "Statut" : "Status"}</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((e) => (
                    <tr key={e.id} className="border-b border-border/60 last:border-0">
                      <td className="px-2 py-3 text-muted-foreground">{formatDate(e.created_at)}</td>
                      <td className="px-2 py-3">
                        {e.score_global != null ? (Number(e.score_global) * 100).toFixed(1) + "%" : "—"}
                      </td>
                      <td className="px-2 py-3"><RiskBadge risk={e.niveau_risque as any} /></td>
                      <td className="px-2 py-3 text-xs uppercase text-muted-foreground">{e.result_mode ?? "—"}</td>
                      <td className="px-2 py-3 text-xs">
                        {e.score_image != null
                          ? <span className="text-green-600">✓ {(Number(e.score_image) * 100).toFixed(0)}%</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-2 py-3 text-xs">
                        {e.score_questionnaire != null
                          ? <span className="text-blue-600">✓ {(Number(e.score_questionnaire) * 100).toFixed(0)}%</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-2 py-3 text-xs uppercase text-muted-foreground">{e.statut}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {isFr ? "Aucun dépistage pour le moment." : "No screenings yet."}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Danger zone — delete patient, at the very bottom */}
      {canWrite && (
        <PatientDeleteButton patientId={params.id} />
      )}
    </div>
  );
}
