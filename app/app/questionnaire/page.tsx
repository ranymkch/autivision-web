import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppRole, can } from "@/lib/rbac";
import { PageHeader } from "@/components/app/page-header";
import { QuestionnaireLandingClient } from "./client";

export default async function QuestionnaireLanding() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app/questionnaire");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, locale")
    .eq("id", user.id)
    .single();
  const role = isAppRole(profile?.role) ? profile!.role : null;
  if (!can(role, "questionnaire:run")) redirect("/app/dashboard");
  const isFr = (profile as any)?.locale === "fr";

  // Exclude patients who already have a completed questionnaire
  const { data: questionnaireDone } = await supabase
    .from("evaluations")
    .select("patient_id")
    .not("score_questionnaire", "is", null);
  const doneIds = new Set((questionnaireDone ?? []).map((r: any) => r.patient_id));

  const { data: allPatients } = await supabase
    .from("patients")
    .select("id, code_anonymise, name, photo_url, age, sexe")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  const patients = (allPatients ?? []).filter((p) => !doneIds.has(p.id)).slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isFr ? "Questionnaire AQ-10" : "AQ-10 questionnaire"}
        subtitle={isFr ? "Choisissez ou créez un patient pour démarrer le questionnaire." : "Choose or create a patient to start the caregiver questionnaire."}
      />
      <QuestionnaireLandingClient patients={patients as any} />
    </div>
  );
}
