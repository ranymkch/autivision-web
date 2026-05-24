"use client";

import { useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import {
  CheckCircle2,
  AlertCircle,
  KeyRound,
  User,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  updateAdminProfile,
  updateAdminEmail,
  changeAdminPassword,
} from "./actions";
import { useI18n } from "@/lib/i18n/provider";

interface Props {
  email: string;
  prenom: string;
  nom: string;
  fullName: string;
  memberSince: string;
}

export function AdminSettingsClient({ email, prenom, nom, memberSince }: Props) {
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
          <InfoRow label={s.roleLabel} value={s.roleAdmin} />
          <InfoRow
            label={s.memberSince}
            value={memberSince ? new Date(memberSince).toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB") : "—"}
          />
        </CardContent>
      </Card>

      <EditProfileForm prenomInit={prenom} nomInit={nom} />
      <UpdateEmailForm currentEmail={email} />
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
      const res = await updateAdminProfile(formData);
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
          <Feedback result={result} successMsg={s.profileUpdatedOk} />
          <div className="flex justify-end">
            <SaveButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function UpdateEmailForm({ currentEmail }: { currentEmail: string }) {
  const { t } = useI18n();
  const s = t.app.settings;
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);
  const [, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await updateAdminEmail(formData);
      setResult(res);
      if (res.ok) toast.success(s.emailConfirmSent);
      else if (res.error) toast.error(res.error);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Mail className="h-4 w-4 text-primary" />
          {s.updateEmail}
        </CardTitle>
        <CardDescription className="text-xs">{s.updateEmailDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new_email">{s.newEmail}</Label>
            <Input
              id="new_email"
              name="new_email"
              type="email"
              placeholder={currentEmail}
              autoComplete="email"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email_current_password">{s.currentPasswordConfirm}</Label>
            <Input
              id="email_current_password"
              name="current_password"
              type="password"
              required
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <Feedback result={result} successMsg={s.emailConfirmSentInbox} />
          <div className="flex justify-end">
            <SaveButton />
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
      const res = await changeAdminPassword(formData);
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
              placeholder="••••••••"
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
          <Feedback result={result} />
          <div className="flex justify-end">
            <PasswordButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Feedback({
  result,
  successMsg,
}: {
  result: { ok?: boolean; error?: string } | null;
  successMsg?: string;
}) {
  const { t } = useI18n();
  if (!result) return null;
  if (result.error) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        {result.error}
      </div>
    );
  }
  if (result.ok) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/20 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        {successMsg ?? t.app.settings.changesSaved}
      </div>
    );
  }
  return null;
}

function SaveButton() {
  const { t } = useI18n();
  const s = t.app.settings;
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? s.saving : s.save}
    </Button>
  );
}

function PasswordButton() {
  const { t } = useI18n();
  const s = t.app.settings;
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? s.updating : s.changePassword}
    </Button>
  );
}
