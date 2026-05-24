import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppRole } from "@/lib/rbac";
import { DoctorDashboard } from "./doctor-dashboard";
import { AdminDashboard } from "./admin-dashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, prenom, nom")
    .eq("id", user.id)
    .single();

  const role = isAppRole(profile?.role) ? profile!.role : null;

  if (role === "doctor") {
    return <DoctorDashboard userId={user.id} />;
  }
  if (role === "admin") {
    return <AdminDashboard />;
  }

  redirect("/login");
}
