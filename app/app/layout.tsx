import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAppRole, can, type AppRole } from "@/lib/rbac";
import { AppShell } from "@/components/app/app-shell";
import { AuthProvider } from "@/components/providers/auth-provider";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, account_status")
    .eq("id", user.id)
    .maybeSingle();

  // Block pending/rejected accounts from accessing the app.
  // Treat null (column not yet migrated) as "approved" so existing accounts
  // are never accidentally locked out.
  const status = profile?.account_status ?? "approved";
  if (status === "pending") redirect("/account-pending");
  if (status === "rejected") redirect("/account-rejected");

  // No profile row means a broken/partial signup — also check user_metadata as fallback
  let role: AppRole | null = isAppRole(profile?.role) ? (profile!.role as AppRole) : null;

  if (!role) {
    const metaRole = user.user_metadata?.role as string | undefined;
    if (metaRole && isAppRole(metaRole)) {
      // Repair the missing/broken profile row
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? "",
        role: metaRole,
        full_name: user.user_metadata?.full_name ?? null,
      }, { onConflict: "id" });
      role = metaRole as AppRole;
    }
  }

  if (!role) redirect("/setup-role");

  const username = (profile?.full_name as string | null) ?? user.email ?? null;

  void can; // referenced by child components via AuthProvider

  return (
    <AuthProvider value={{ isAuthenticated: true, email: user.email ?? null, username, role }}>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
