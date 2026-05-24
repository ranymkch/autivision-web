import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAppRole, can } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { ScreeningResultClient } from "./result-client";

export default async function ScreeningResultPage({ params }: { params: { evalId: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, locale")
    .eq("id", user.id)
    .single();
  const role = isAppRole(profile?.role) ? profile!.role : null;
  const isFr = profile?.locale === "fr";
  if (!can(role, "screening:run")) redirect("/app/dashboard");

  const { data: ev, error } = await supabase
    .from("evaluations")
    .select(`
      id, created_at, niveau_risque, score_image, score_global,
      ml_prediction, ml_confidence, ml_model, result_mode, patient_id,
      patients(id, code_anonymise, name, photo_url, age, sexe)
    `)
    .eq("id", params.evalId)
    .single();

  if (error || !ev) notFound();

  const evalData = ev as any;
  const patient = evalData.patients as {
    id: string;
    code_anonymise: string;
    name: string | null;
    photo_url: string | null;
    age: number | null;
    sexe: string;
  } | null;

  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2">
        <Link href="/app/screening"><ArrowLeft /> {isFr ? "Nouveau dépistage" : "New screening"}</Link>
      </Button>

      <PageHeader
        title={isFr ? "Résultat du dépistage IA" : "AI Screening Result"}
        subtitle={patient ? `${patient.name ?? patient.code_anonymise} · ${new Date(evalData.created_at).toLocaleDateString()}` : undefined}
      />

      <ScreeningResultClient
        evalId={params.evalId}
        patientId={evalData.patient_id}
        patientCode={patient?.code_anonymise ?? "—"}
        patientName={patient?.name ?? null}
        patientPhoto={patient?.photo_url ?? null}
        patientAge={patient?.age ?? null}
        patientSexe={(patient?.sexe ?? null) as "M" | "F" | "AUTRE" | null}
        scoreImage={evalData.score_image != null ? Number(evalData.score_image) : null}
        niveauRisque={evalData.niveau_risque as "FAIBLE" | "MODERE" | "ELEVE" | null}
        mlPrediction={evalData.ml_prediction as "autistic" | "non_autistic" | null}
        mlModel="AI Screening Engine"
        locale={(profile?.locale ?? "fr") as "en" | "fr"}
      />
    </div>
  );
}
