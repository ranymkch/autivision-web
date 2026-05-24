"use client";

import { Suspense, useEffect, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Mail, RefreshCw, ArrowRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/provider";
import { verifyEmailOtp, type VerifyState } from "./actions";

const initial: VerifyState = {};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const { t } = useI18n();
  const v = t.auth.verifyEmail;
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const router = useRouter();

  const [state, formAction] = useFormState(verifyEmailOtp, initial);
  const [resending, startResend] = useTransition();
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
    if (state?.success) router.push("/account-pending");
  }, [state, router]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  function handleResend() {
    if (!email || resendCooldown > 0) return;
    startResend(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(v.resendSuccess);
        setResendCooldown(60);
      }
    });
  }

  return (
    <Card className="w-full max-w-md border-border/80 shadow-xl">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
          <Mail className="h-5 w-5" />
        </div>
        <CardTitle className="font-display text-2xl">{v.title}</CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          {email ? v.descWithEmail.replace("{email}", email) : v.desc}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="email" value={email} />

          <div className="space-y-2">
            <Label htmlFor="token">{v.codeLabel}</Label>
            <Input
              id="token"
              name="token"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className="text-center text-2xl tracking-[0.4em] font-mono"
              autoComplete="one-time-code"
              required
            />
          </div>

          <SubmitButton label={v.submit} pendingLabel={v.submitting} />
        </form>

        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">{v.noCode}</p>
          <Button
            variant="ghost"
            size="sm"
            disabled={resending || resendCooldown > 0}
            onClick={handleResend}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {resendCooldown > 0 ? v.resendCooldown.replace("{s}", String(resendCooldown)) : v.resend}
          </Button>
        </div>

        <div className="text-center">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{v.backToLogin}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? pendingLabel : (
        <>
          {label} <ArrowRight className="h-4 w-4" />
        </>
      )}
    </Button>
  );
}
