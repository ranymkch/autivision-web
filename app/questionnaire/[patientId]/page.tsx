import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppRole, can, type AppRole } from "@/lib/rbac";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Sidebar } from "@/components/app/sidebar";
import { Topbar } from "@/components/app/topbar";
import { PageHeader } from "@/components/app/page-header";
import { QuestionnaireClient } from "./client";

export default async function QuestionnairePage({
  params,
  searchParams,
}: {
  params: { patientId: string };
  searchParams?: { evaluation?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/questionnaire/${params.patientId}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, locale")
    .eq("id", user.id)
    .single();
  const role = isAppRole(profile?.role) ? (profile!.role as AppRole) : null;
  const username = (profile?.full_name as string | null) ?? user.email ?? null;
  const isFr = profile?.locale === "fr";
  if (!can(role, "questionnaire:run")) redirect("/app/dashboard");

  const { data: patient } = await supabase
    .from("patients")
    .select("id, code_anonymise, name, age, sexe")
    .eq("id", params.patientId)
    .single();
  if (!patient) notFound();

  const evaluationId = searchParams?.evaluation ?? null;
  const p = patient as any;

  return (
    <AuthProvider value={{ isAuthenticated: true, email: user.email ?? null, username, role }}>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-6 py-8 md:px-10 md:py-10">
            <div className="mx-auto max-w-3xl">
              <PageHeader
                title={isFr ? "Questionnaire AQ-10" : "AQ-10 questionnaire"}
                subtitle={`${p.name ?? p.code_anonymise} · ${p.code_anonymise}`}
              />
              <QuestionnaireClient
                patientId={params.patientId}
                patientLabel={p.name ?? p.code_anonymise}
                evaluationId={evaluationId}
                locale={(profile?.locale ?? "fr") as "en" | "fr"}
              />
            </div>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
