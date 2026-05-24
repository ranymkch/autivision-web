import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";
import { AuthProvider } from "@/components/providers/auth-provider";

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthProvider value={{ isAuthenticated: !!user, email: user?.email ?? null, username: null, role: null }}>
      <MarketingNavbar />
      <main>{children}</main>
      <MarketingFooter />
    </AuthProvider>
  );
}
