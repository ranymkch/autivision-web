"use client";

import { Suspense, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/provider";
import { signInWithPassword, type LoginState } from "./actions";
import { toast } from "sonner";

const initial: LoginState = {};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const { t } = useI18n();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "";
  const errFromUrl = sp.get("error");
  const [state, formAction] = useFormState(signInWithPassword, initial);

  useEffect(() => {
    if (errFromUrl) toast.error(errFromUrl);
  }, [errFromUrl]);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <Card className="w-full max-w-md border-border/80 shadow-xl">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <CardTitle className="font-display text-2xl">{t.auth.login.title}</CardTitle>
        <CardDescription>{t.auth.login.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div className="space-y-2">
            <Label htmlFor="email">{t.auth.login.email}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@hospital.org"
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t.auth.login.password}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="pl-9"
              />
            </div>
          </div>
          <SubmitButton label={t.auth.login.submit} />
        </form>

        <div className="mt-4 flex flex-col items-center gap-1">
          <p className="text-center text-xs text-muted-foreground">
            {t.auth.login.noAccount}{" "}
            <Link href="/signup" className="underline-offset-4 hover:underline">
              {t.auth.login.signUp}
            </Link>
          </p>
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/forgot-password" className="underline-offset-4 hover:underline">
              {t.auth.login.forgotPassword}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "…" : (
        <>
          {label} <ArrowRight />
        </>
      )}
    </Button>
  );
}
