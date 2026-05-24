"use client";

import { Suspense, useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { ArrowRight, Lock, Mail, Hash } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { signUp, type SignupState } from "./actions";
import { useI18n } from "@/lib/i18n/provider";
import { toast } from "sonner";

const initial: SignupState = {};

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupInner />
    </Suspense>
  );
}

function SignupInner() {
  const { t } = useI18n();
  const s = t.auth.signup;
  const [state, formAction] = useFormState(signUp, initial);
  const [role, setRole] = useState<"doctor" | null>("doctor");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  const passwordMismatch = confirm.length > 0 && password !== confirm;

  const formDisabled =
    !role ||
    passwordMismatch ||
    password.length < 8;

  return (
    <Card className="w-full max-w-lg border-border/80 shadow-xl">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="font-display text-2xl">{s.title}</CardTitle>
        <CardDescription>{s.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="role" value={role ?? ""} />

          {/* First name + Last name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="prenom">{s.prenom}</Label>
              <Input
                id="prenom"
                name="prenom"
                type="text"
                autoComplete="given-name"
                required
                placeholder={s.prenomPlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom">{s.nom}</Label>
              <Input
                id="nom"
                name="nom"
                type="text"
                autoComplete="family-name"
                required
                placeholder={s.nomPlaceholder}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">{s.email}</Label>
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

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">{s.password}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Confirm password */}
          <div className="space-y-2">
            <Label htmlFor="confirm">{s.confirmPassword}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                className={cn("pl-9", passwordMismatch && "border-destructive focus-visible:ring-destructive")}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {passwordMismatch && (
              <p className="text-[11px] text-destructive">{s.passwordMismatch}</p>
            )}
          </div>

          {/* Serial number */}
          <div className="space-y-2">
            <Label htmlFor="numero_serie">{s.serialNumber}</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="numero_serie"
                name="numero_serie"
                type="text"
                placeholder={s.serialNumberPlaceholder}
                className="pl-9"
              />
            </div>
          </div>

          <SubmitButton label={s.submit} pendingLabel={s.submitting} disabled={formDisabled} />
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {s.haveAccount}{" "}
          <Link href="/login" className="underline-offset-4 hover:underline">
            {s.signIn}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function SubmitButton({ label, pendingLabel, disabled }: { label: string; pendingLabel: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={disabled || pending}>
      {pending ? pendingLabel : (
        <>
          {label} <ArrowRight />
        </>
      )}
    </Button>
  );
}
