import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function sessionOnly(opts: CookieOptions): CookieOptions {
  const { maxAge: _m, expires: _e, ...rest } = opts as any;
  return rest;
}

const PKCE_VERIFIER_COOKIE = "code-verifier";
const PKCE_MAX_AGE = 60 * 10;

function cookieOptions(name: string, opts: CookieOptions): CookieOptions {
  if (name.includes(PKCE_VERIFIER_COOKIE)) {
    const { maxAge: _m, expires: _e, ...rest } = opts as any;
    return { ...rest, maxAge: PKCE_MAX_AGE };
  }
  return sessionOnly(opts);
}

const APP_PREFIX = "/app";
const AUTH_PATHS = ["/login", "/signup", "/verify", "/verify-email", "/forgot-password"];
// Pages that pending/rejected users can land on without being bounced
const STATUS_PAGES = ["/account-pending", "/account-rejected"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          const opts = cookieOptions(name, options);
          request.cookies.set({ name, value, ...opts });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value, ...opts });
        },
        remove(name: string, options: CookieOptions) {
          const opts = cookieOptions(name, options);
          request.cookies.set({ name, value: "", ...opts });
          response = NextResponse.next({ request });
          response.cookies.set({ name, value: "", ...opts });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  const isAppRoute = pathname.startsWith(APP_PREFIX);
  const isAuthRoute = AUTH_PATHS.some((p) => pathname.startsWith(p));
  const isStatusPage = STATUS_PAGES.some((p) => pathname.startsWith(p));

  // Unauthenticated users cannot access the app.
  if (isAppRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // For authenticated users on either an auth route or an app route we need to
  // check approval status. We do a single profile fetch and reuse it for both
  // branch decisions to avoid a double round-trip.
  if (user && (isAuthRoute || isAppRoute) && !isStatusPage) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("account_status")
      .eq("id", user.id)
      .maybeSingle();

    const status = profile?.account_status ?? "approved";

    if (status === "pending") {
      if (!isStatusPage) {
        return NextResponse.redirect(new URL("/account-pending", request.url));
      }
    } else if (status === "rejected") {
      if (!isStatusPage) {
        return NextResponse.redirect(new URL("/account-rejected", request.url));
      }
    } else if (isAuthRoute) {
      // Approved user hitting a login/signup page → send to dashboard.
      // Use a clean URL (no query params) so error strings from auth pages
      // don't leak into the dashboard URL via url.clone().
      const url = new URL("/app/dashboard", request.url);
      return NextResponse.redirect(url);
    }
  }

  return response;
}
