import { createClient } from "@/lib/supabase/server";
import { isAppRole, type AppRole } from "@/lib/rbac";
import type { AccountStatus } from "@/types/database";

/**
 * Returns the authenticated user + their app role + account status in one round-trip.
 * Use this in server actions that require RBAC + approval checks.
 */
export async function getSessionWithRole(): Promise<{
  user: { id: string; email?: string } | null;
  role: AppRole | null;
  accountStatus: AccountStatus | null;
  supabase: ReturnType<typeof createClient>;
}> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, role: null, accountStatus: null, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .single();

  const role = isAppRole(profile?.role) ? profile!.role : null;
  const accountStatus = (profile?.account_status as AccountStatus | undefined) ?? null;
  return { user, role, accountStatus, supabase };
}
