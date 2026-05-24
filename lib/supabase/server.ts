import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Auth session tokens: session-only (cleared on browser close). */
function sessionOnly(opts: CookieOptions): CookieOptions {
  const { maxAge: _m, expires: _e, ...rest } = opts as any;
  return rest;
}

/**
 * PKCE code-verifier cookies need to survive long enough for the user to open
 * their email and click the confirmation link. We give them 10 minutes instead
 * of making them session-only, so a new tab or a brief browser restart doesn't
 * silently drop them.
 */
const PKCE_VERIFIER_COOKIE = "code-verifier";
const PKCE_MAX_AGE = 60 * 10; // 10 minutes

function cookieOptions(name: string, opts: CookieOptions): CookieOptions {
  if (name.includes(PKCE_VERIFIER_COOKIE)) {
    const { maxAge: _m, expires: _e, ...rest } = opts as any;
    return { ...rest, maxAge: PKCE_MAX_AGE };
  }
  return sessionOnly(opts);
}

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...cookieOptions(name, options) });
          } catch {
            // Server component — ignore; middleware refreshes the session.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...cookieOptions(name, options) });
          } catch {
            // Server component — ignore.
          }
        },
      },
    }
  );
}
