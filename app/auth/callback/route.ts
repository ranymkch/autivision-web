import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { isAppRole } from "@/lib/rbac";

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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/account-pending";

  if (!code) {
    return NextResponse.redirect(
      new URL("/verify-email?error=missing_code", url.origin)
    );
  }

  // Build the success redirect response FIRST so the Supabase client can write
  // the new session cookies directly onto it. If we use cookies() from
  // next/headers and return a separate NextResponse.redirect(), the Set-Cookie
  // headers from exchangeCodeForSession are attached to Next's internal response
  // object — not to our redirect — and the browser never receives the new session.
  const redirectTo = new URL("/account-pending", url.origin);
  const response = NextResponse.redirect(redirectTo);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...cookieOptions(name, options) });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...cookieOptions(name, options) });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/verify-email?error=${encodeURIComponent(error.message)}`, url.origin)
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const metaRole = user.user_metadata?.role as string | undefined;
    const metaName = user.user_metadata?.full_name as string | undefined;

    if (metaRole && isAppRole(metaRole)) {
      const metaPrenom = user.user_metadata?.prenom as string | undefined;
      const metaNom = user.user_metadata?.nom as string | undefined;
      const metaSerie = user.user_metadata?.numero_serie as string | undefined;
      await supabase
        .from("profiles")
        .update({
          role: metaRole,
          account_status: "pending",
          email_verified: true,
          ...(metaName ? { full_name: metaName } : {}),
          ...(metaPrenom ? { prenom: metaPrenom } : {}),
          ...(metaNom ? { nom: metaNom } : {}),
          ...(metaSerie ? { numero_serie: metaSerie } : {}),
        })
        .eq("id", user.id);
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!isAppRole(profile?.role)) {
        const setupUrl = new URL("/setup-role", url.origin);
        setupUrl.searchParams.set("next", next);
        return NextResponse.redirect(setupUrl);
      }

      await supabase
        .from("profiles")
        .update({ email_verified: true })
        .eq("id", user.id);
    }
  }

  // Return the redirect with the session cookies already attached.
  return response;
}
