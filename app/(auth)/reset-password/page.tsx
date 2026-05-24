"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/provider";

export default function ResetPasswordPage() {
  const { locale } = useI18n();
  const isFr = locale === "fr";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(isFr ? "Les mots de passe ne correspondent pas." : "Passwords do not match.");
      return;
    }
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (error) {
      toast.error(error.message);
    } else {
      setDone(true);
      setTimeout(() => router.replace("/app/dashboard"), 2000);
    }
  }

  const mismatch = confirm.length > 0 && password !== confirm;

  if (done) {
    return (
      <Card className="w-full max-w-md border-border/80 shadow-xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
            <Lock className="h-5 w-5" />
          </div>
          <CardTitle className="font-display text-2xl">{isFr ? "Mot de passe mis à jour" : "Password updated"}</CardTitle>
          <CardDescription>{isFr ? "Redirection vers votre espace…" : "Redirecting you to your dashboard…"}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-border/80 shadow-xl">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Lock className="h-5 w-5" />
        </div>
        <CardTitle className="font-display text-2xl">{isFr ? "Nouveau mot de passe" : "Set new password"}</CardTitle>
        <CardDescription>{isFr ? "Choisissez un mot de passe fort pour votre compte." : "Choose a strong password for your account."}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{isFr ? "Nouveau mot de passe" : "New password"}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {password.length > 0 && password.length < 8 && (
              <p className="text-[11px] text-muted-foreground">{isFr ? "Au moins 8 caractères requis." : "At least 8 characters required."}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">{isFr ? "Confirmer le mot de passe" : "Confirm password"}</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                className={cn("pl-9", mismatch && "border-destructive")}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            {mismatch && <p className="text-[11px] text-destructive">{isFr ? "Les mots de passe ne correspondent pas." : "Passwords do not match."}</p>}
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={pending || mismatch || password.length < 8}
          >
            {pending ? (isFr ? "Enregistrement…" : "Saving…") : <>{isFr ? "Définir le mot de passe" : "Set password"} <ArrowRight /></>}
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/login" className="underline-offset-4 hover:underline">{isFr ? "Retour à la connexion" : "Back to login"}</Link>
        </p>
      </CardContent>
    </Card>
  );
}
