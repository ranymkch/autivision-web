"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, LogOut } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";

type PageState = "loading" | "no_session" | "pending_approval";

export default function AccountPendingPage() {
  const router = useRouter();
  const { t } = useI18n();
  const p = t.auth.pending;

  const [pageState, setPageState] = useState<PageState>("loading");

  useEffect(() => {
    const supabase = createClient();
    let interval: ReturnType<typeof setInterval>;

    async function checkStatus() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setPageState("no_session");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_status")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.account_status === "approved") {
        clearInterval(interval);
        router.replace("/app/dashboard");
        return;
      }

      if (profile?.account_status === "rejected") {
        clearInterval(interval);
        await supabase.auth.signOut();
        router.replace("/account-rejected");
        return;
      }

      setPageState("pending_approval");
    }

    checkStatus();
    interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (pageState === "loading") {
    return (
      <Card className="w-full max-w-md border-border/80 shadow-xl">
        <CardContent className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  if (pageState === "no_session") {
    return (
      <Card className="w-full max-w-md border-border/80 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="font-display text-2xl">{p.title}</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {p.noSessionDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild variant="outline" size="sm">
            <Link href="/login">{p.backToLogin}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-border/80 shadow-xl">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
          <Clock className="h-5 w-5 animate-pulse" />
        </div>
        <CardTitle className="font-display text-2xl">{p.title}</CardTitle>
        <CardDescription className="text-sm leading-relaxed">{p.desc}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        <p className="text-xs text-muted-foreground">{p.pollingHint}</p>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {p.signOut}
        </Button>
      </CardContent>
    </Card>
  );
}
