"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, AlertCircle, KeyRound, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProfile, changePassword } from "./actions";
import { useI18n } from "@/lib/i18n/provider";

interface Props {
  email: string;
  prenom: string;
  nom: string;
  fullName: string;
  role: string;
  memberSince: string;
}

export function SettingsClient({ email, prenom, nom, memberSince, role }: Props) {
  const { t, locale } = useI18n();
  const s = t.app.settings;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-primary" />
            {s.accountInfo}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <InfoRow label={s.email} value={email} />
          <InfoRow label={s.roleLabel} value={role === "doctor" ? s.roleDoctor : role} />
          <InfoRow
            label={s.memberSince}
            value={memberSince ? new Date(memberSince).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB") : "—"}
          />
        </CardContent>
      </Card>

      <EditProfileForm prenomInit={prenom} nomInit={nom} />
      <ChangePasswordForm />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-3 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}

function EditProfileForm({ prenomInit, nomInit }: { prenomInit: string; nomInit: string }) {
  const { t } = useI18n();
  const s = t.app.settings;
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await updateProfile(formData);
      setResult(res);
      if (res.ok) toast.success(s.profileUpdated);
      else if (res.error) toast.error(res.error);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="h-4 w-4 text-primary" />
          {s.editInfo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="prenom">{t.auth.signup.prenom}</Label>
              <Input
                id="prenom"
                name="prenom"
                defaultValue={prenomInit}
                placeholder={t.auth.signup.prenomPlaceholder}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nom">{t.auth.signup.nom}</Label>
              <Input
                id="nom"
                name="nom"
                defaultValue={nomInit}
                placeholder={t.auth.signup.nomPlaceholder}
              />
            </div>
          </div>

          {result?.error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {result.error}
            </div>
          )}
          {result?.ok && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/20 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {s.profileUpdatedOk}
            </div>
          )}

          <div className="flex justify-end">
            <ProfileSubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ChangePasswordForm() {
  const { t } = useI18n();
  const s = t.app.settings;
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await changePassword(formData);
      setResult(res);
      if (res.ok) toast.success(s.passwordChanged);
      else if (res.error) toast.error(res.error);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-primary" />
          {s.changePassword}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current_password">{s.currentPassword}</Label>
            <Input
              id="current_password"
              name="current_password"
              type="password"
              required
              placeholder={s.currentPassword}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new_password">{s.newPassword}</Label>
            <Input
              id="new_password"
              name="new_password"
              type="password"
              minLength={8}
              placeholder={s.minPassword}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm_password">{s.confirmNewPassword}</Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="password"
              minLength={8}
              placeholder={s.repeatPassword}
              autoComplete="new-password"
            />
          </div>

          {result?.error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {result.error}
            </div>
          )}
          {result?.ok && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/20 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              {s.passwordChangedOk}
            </div>
          )}

          <div className="flex justify-end">
            <PasswordSubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ProfileSubmitButton() {
  const { t } = useI18n();
  const s = t.app.settings;
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? s.saving : s.save}
    </Button>
  );
}

function PasswordSubmitButton() {
  const { t } = useI18n();
  const s = t.app.settings;
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? s.updating : s.changePassword}
    </Button>
  );
}
