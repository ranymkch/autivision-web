import { createClient } from "@supabase/supabase-js";

/**
 * Returns a Supabase client with the service-role key.
 * Only call this from server actions / API routes — never expose to the browser.
 * Throws a clear error if SUPABASE_SERVICE_ROLE_KEY is not set.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set in .env.local. " +
      "Copy it from Supabase Dashboard → Project Settings → API → service_role key."
    );
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
