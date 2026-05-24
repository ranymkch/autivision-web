import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { isAppRole, can } from "@/lib/rbac";
import { ScreeningClient } from "./client";
import { PageHeader } from "@/components/app/page-header";

export default async function ScreeningPage({
  searchParams,
}: {
  searchParams: { patient?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, locale")
    .eq("id", user!.id)
    .single();
  const role = isAppRole(profile?.role) ? profile!.role : null;
  if (!can(role, "screening:run")) redirect("/app/dashboard");
  const t = getDictionary(((profile as any)?.locale ?? "fr") as Locale);

  const prePatientId = searchParams?.patient ?? null;

  // Fetch patients who do NOT already have an AI screening result
  const { data: screeningDone } = await supabase
    .from("evaluations")
    .select("patient_id")
    .not("score_image", "is", null);
  const screenedIds = new Set((screeningDone ?? []).map((r: any) => r.patient_id));

  const { data: allPatients } = await supabase
    .from("patients")
    .select("id, code_anonymise, name, age, sexe, photo_url")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  // Hide patients who already have a screening, but always include the redo target
  const patients = (allPatients ?? [])
    .filter((p) => !screenedIds.has(p.id) || p.id === prePatientId)
    .slice(0, 10);

  const preSelectedPatient = prePatientId
    ? ((allPatients ?? []).find((p) => p.id === prePatientId) ?? null)
    : null;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={t.app.screening.title}
        subtitle={t.app.screening.subtitle}
      />
      <ScreeningClient patients={patients as any} preSelectedPatient={preSelectedPatient as any} />
    </div>
  );
}
