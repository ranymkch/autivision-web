"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sendPasswordReset, verifyResetOtp, type ForgotState, type VerifyResetState } from "./actions";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/provider";

const initial: ForgotState = {};
const initialVerify: VerifyResetState = {};

export default function ForgotPasswordPage() {
  const { locale } = useI18n();
  const isFr = locale === "fr";
  const router = useRouter();
  const [state, formAction] = useFormState(sendPasswordReset, initial);
  const [verifyState, verifyAction] = useFormState(verifyResetOtp, initialVerify);

  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  useEffect(() => {
    if (verifyState.error) toast.error(verifyState.error);
    if (verifyState.success) router.push("/reset-password");
  }, [verifyState, router]);

  // Step 2: code entry
  if (state.ok && state.email) {
    return (
      <Card className="w-full max-w-md border-border/80 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <Mail className="h-5 w-5" />
          </div>
          <CardTitle className="font-display text-2xl">{isFr ? "Consultez votre boîte mail" : "Check your inbox"}</CardTitle>
          <CardDescription>
            {isFr ? "Entrez le code à 6 chiffres envoyé à " : "Enter the 6-digit code sent to "}<strong>{state.email}</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form action={verifyAction} className="space-y-4">
            <input type="hidden" name="email" value={state.email} />
            <div className="space-y-2">
              <Label htmlFor="token">{isFr ? "Code de vérification" : "Verification code"}</Label>
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
            <VerifyButton />
          </form>
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/login" className="underline-offset-4 hover:underline">
              {isFr ? "Retour à la connexion" : "Back to login"}
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  // Step 1: email form
  return (
    <Card className="w-full max-w-md border-border/80 shadow-xl">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Mail className="h-5 w-5" />
        </div>
        <CardTitle className="font-display text-2xl">{isFr ? "Réinitialiser le mot de passe" : "Reset password"}</CardTitle>
        <CardDescription>
          {isFr
            ? "Entrez votre email et nous vous enverrons un code pour définir un nouveau mot de passe."
            : "Enter your email and we'll send you a code to set a new password."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder={isFr ? "vous@hopital.fr" : "you@hospital.org"}
                className="pl-9"
              />
            </div>
          </div>
          <SendButton isFr={isFr} />
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/login" className="underline-offset-4 hover:underline">
            {isFr ? "Retour à la connexion" : "Back to login"}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function SendButton({ isFr }: { isFr: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (isFr ? "Envoi…" : "Sending…") : <>{isFr ? "Envoyer le code" : "Send code"} <ArrowRight className="h-4 w-4" /></>}
    </Button>
  );
}

function VerifyButton() {
  const { locale } = useI18n();
  const isFr = locale === "fr";
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? (isFr ? "Vérification…" : "Verifying…") : <>{isFr ? "Vérifier le code" : "Verify code"} <ArrowRight className="h-4 w-4" /></>}
    </Button>
  );
}
