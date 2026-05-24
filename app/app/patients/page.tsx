import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAppRole, can } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PatientsHeading, EmptyState } from "./client";
import { PatientsTable } from "./patients-table";

export default async function PatientsPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, locale")
    .eq("id", user!.id)
    .single();
  const role = isAppRole(profile?.role) ? profile!.role : null;
  const isFr = profile?.locale === "fr";
  const showIdentity = can(role, "patients:viewIdentity");
  const canWrite = can(role, "patients:write");

  const { data: patientsData } = await supabase
    .from("patients")
    .select("id, code_anonymise, name, photo_url, age, sexe, created_at")
    .order("created_at", { ascending: false });
  const patients = patientsData ?? [];

  return (
    <>
      <PatientsHeading
        action={
          canWrite ? (
            <Button asChild>
              <Link href="/app/patients/new">
                <Plus /> {isFr ? "Nouveau patient" : "New patient"}
              </Link>
            </Button>
          ) : null
        }
      />

      <Card>
        <CardContent className="p-0">
          {patients.length > 0 ? (
            <PatientsTable
              patients={patients as any}
              showIdentity={showIdentity}
              defaultQuery={searchParams?.q ?? ""}
            />
          ) : (
            <EmptyState canCreate={canWrite} />
          )}
        </CardContent>
      </Card>
    </>
  );
}
