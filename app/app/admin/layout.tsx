import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/lib/rbac";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  // Fall back to user_metadata role if profile query returned nothing (transient DB issue)
  const role = profile?.role ?? (user.user_metadata?.role as string | undefined) ?? null;

  if (!can(role as any, "admin:manage")) redirect("/app/dashboard");

  return <>{children}</>;
}
