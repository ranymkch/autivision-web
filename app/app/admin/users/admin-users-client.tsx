"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useFormStatus } from "react-dom";
import {
  Filter, Pencil, Plus, Search, Trash2, UserCheck, UserX, X, ExternalLink, MailCheck, MailX
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import { setAccountStatus, deleteUser, createUserByAdmin, updateUser } from "./actions";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";

type UserRow = {
  id: string;
  full_name: string | null;
  prenom: string | null;
  nom: string | null;
  email: string;
  role: string | null;
  account_status: string;
  email_verified: boolean;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

export function AdminUsersClient({ users: initialUsers }: { users: UserRow[] }) {
  const { t, locale } = useI18n();
  const a = t.app.admin;
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { setUsers(initialUsers); }, [initialUsers]);

  // Realtime: listen for new or updated profile rows so pending requests appear instantly
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("admin-users-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as UserRow;
            if (row.role === "admin") return;
            setUsers((prev) => {
              if (prev.find((u) => u.id === row.id)) return prev;
              return [row, ...prev];
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as UserRow;
            if (updated.role === "admin") {
              setUsers((prev) => prev.filter((u) => u.id !== updated.id));
              return;
            }
            setUsers((prev) =>
              prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u))
            );
          } else if (payload.eventType === "DELETE") {
            setUsers((prev) => prev.filter((u) => u.id !== (payload.old as UserRow).id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const removeUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const name = u.prenom && u.nom ? `${u.prenom} ${u.nom}` : (u.full_name ?? "");
    const matchSearch = !q || name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || u.account_status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Only verified accounts require admin action — unverified pending users haven't
  // completed email confirmation yet and should not appear in the approval queue.
  const pendingVerifiedCount = users.filter(
    (u) => u.account_status === "pending" && u.email_verified
  ).length;

  return (
    <div className="space-y-4">
      {/* Pending badge — only counts email-verified accounts awaiting approval */}
      {pendingVerifiedCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/20">
          <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
          <span className="font-medium text-amber-700 dark:text-amber-400">
            {a.pendingBadge.replace("{n}", String(pendingVerifiedCount))}
          </span>
        </div>
      )}

      {/* Filters + create */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={a.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">{a.filters.allStatuses}</option>
            <option value="pending">{a.filters.pending}</option>
            <option value="approved">{a.filters.approved}</option>
            <option value="rejected">{a.filters.rejected}</option>
          </select>
        </div>

        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> {a.createUser}
        </Button>
      </div>

      {/* Create user panel */}
      {showCreate && (
        <CreateUserPanel onClose={() => setShowCreate(false)} />
      )}

      {/* Doctors table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[580px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3 font-medium">{a.roles.doctor}</th>
                    <th className="px-5 py-3 font-medium">{a.table.email}</th>
                    <th className="px-5 py-3 font-medium">{a.table.status}</th>
                    <th className="px-5 py-3 font-medium">{a.table.joined}</th>
                    <th className="px-5 py-3 font-medium">{a.table.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <DoctorTableRow key={u.id} user={u} onRemove={removeUser} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {a.noMatch}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DoctorTableRow({ user: u, onRemove }: { user: UserRow; onRemove: (id: string) => void }) {
  const { t } = useI18n();
  const a = t.app.admin;
  const [isPending, startTransition] = useTransition();
  const [showEdit, setShowEdit] = useState(false);

  const displayName = u.prenom && u.nom ? `${u.prenom} ${u.nom}` : (u.full_name ?? "—");

  function handleApprove() {
    startTransition(async () => {
      const res = await setAccountStatus(u.id, "approved");
      if (res?.error) { toast.error(res.error); return; }
      toast.success(a.approvedMsg);
    });
  }

  function handleReject() {
    startTransition(async () => {
      const res = await setAccountStatus(u.id, "rejected");
      if (res?.error) { toast.error(res.error); return; }
      toast.success(a.rejectedMsg);
    });
  }

  function handleDelete() {
    if (!confirm(a.deleteConfirm.replace("{email}", u.email))) return;
    startTransition(async () => {
      const res = await deleteUser(u.id);
      if (res?.error) { toast.error(res.error); return; }
      toast.success(a.deletedMsg);
      onRemove(u.id);
    });
  }

  return (
    <>
    <tr className={cn(
      "border-b border-border/60 last:border-0 hover:bg-secondary/40 transition-colors",
      isPending && "opacity-50"
    )}>
      <td className="px-5 py-3 font-medium">{displayName}</td>
      <td className="px-5 py-3 text-muted-foreground text-xs">{u.email}</td>
      <td className="px-5 py-3">
        <div className="flex flex-col gap-1">
          <span className={cn(
            "w-fit rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase",
            STATUS_STYLES[u.account_status] ?? "bg-secondary text-muted-foreground"
          )}>
            {a.status[u.account_status as keyof typeof a.status] ?? u.account_status}
          </span>
          {u.email_verified ? (
            <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
              <MailCheck className="h-3 w-3" />
              {a.emailVerified}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <MailX className="h-3 w-3" />
              {a.emailUnverified}
            </span>
          )}
        </div>
      </td>
      <td className="px-5 py-3 text-muted-foreground text-xs">{formatDate(u.created_at)}</td>
      <td className="px-5 py-3">
        <div className="flex items-center gap-1.5">
          {/* View doctor profile */}
          <Button asChild size="icon" variant="ghost" className="h-7 w-7" title={a.viewProfile}>
            <Link href={`/app/admin/users/${u.id}`}>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </Button>

          {/* Edit doctor */}
          <Button
            size="icon" variant="ghost"
            className="h-7 w-7 text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/20"
            onClick={() => setShowEdit((v) => !v)}
            disabled={isPending}
            title={t.common.edit}
          >
            <Pencil className="h-4 w-4" />
          </Button>

          {u.account_status === "pending" && (
            <>
              {/* Only allow approve/reject for email-verified accounts */}
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/20"
                onClick={handleApprove}
                disabled={isPending || !u.email_verified}
                title={u.email_verified ? a.approve : a.emailNotYetVerified}
              >
                <UserCheck className="h-4 w-4" />
              </Button>
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20"
                onClick={handleReject}
                disabled={isPending || !u.email_verified}
                title={u.email_verified ? a.reject : a.emailNotYetVerified}
              >
                <UserX className="h-4 w-4" />
              </Button>
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={handleDelete} disabled={isPending} title={a.delete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {u.account_status === "approved" && (
            <>
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/20"
                onClick={handleReject} disabled={isPending} title={a.revoke}
              >
                <UserX className="h-4 w-4" />
              </Button>
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={handleDelete} disabled={isPending} title={a.delete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
          {u.account_status === "rejected" && (
            <>
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/20"
                onClick={handleApprove} disabled={isPending} title={a.approve}
              >
                <UserCheck className="h-4 w-4" />
              </Button>
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                onClick={handleDelete} disabled={isPending} title={a.delete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
    {showEdit && (
      <tr className="border-b border-border/60 bg-blue-50/40 dark:bg-blue-950/10">
        <td colSpan={5} className="px-5 py-4">
          <EditUserPanel user={u} onClose={() => setShowEdit(false)} />
        </td>
      </tr>
    )}
    </>
  );
}

function EditUserPanel({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const { t } = useI18n();
  const a = t.app.admin;
  const s = t.app.settings;
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const prenom = (fd.get("prenom") as string).trim();
    const nom = (fd.get("nom") as string).trim();
    const email = (fd.get("email") as string).trim();
    setError(null);
    startTransition(async () => {
      const res = await updateUser(user.id, { prenom, nom, email });
      if (res?.error) { setError(res.error); return; }
      toast.success(a.updatedMsg);
      onClose();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
      <div className="space-y-1">
        <Label htmlFor={`edit_prenom_${user.id}`}>{t.auth.signup.prenom}</Label>
        <Input
          id={`edit_prenom_${user.id}`}
          name="prenom"
          required
          defaultValue={user.prenom ?? ""}
          className="w-40"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`edit_nom_${user.id}`}>{t.auth.signup.nom}</Label>
        <Input
          id={`edit_nom_${user.id}`}
          name="nom"
          required
          defaultValue={user.nom ?? ""}
          className="w-40"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`edit_email_${user.id}`}>{t.app.settings.email}</Label>
        <Input
          id={`edit_email_${user.id}`}
          name="email"
          type="email"
          required
          defaultValue={user.email}
          className="w-64"
        />
      </div>
      {error && (
        <p className="w-full rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? s.saving : t.app.settings.save}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          {t.common.cancel}
        </Button>
      </div>
    </form>
  );
}

function CreateUserPanel({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const a = t.app.admin;
  const s = t.app.settings;
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(formData: FormData) {
    setError(null);
    formData.set("role", "doctor");
    const res = await createUserByAdmin(formData);
    if (res.error) {
      setError(res.error);
      toast.error(res.error);
    } else {
      toast.success(a.createdMsg);
      onClose();
    }
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{a.createTitle}</CardTitle>
        <Button size="icon" variant="ghost" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form action={handleCreate} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new_full_name">{a.fields.displayName}</Label>
              <Input id="new_full_name" name="full_name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new_email">{a.fields.email}</Label>
              <Input id="new_email" name="email" type="email" required />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="new_password">{a.fields.password}</Label>
              <Input id="new_password" name="password" type="password" required placeholder={s.minPassword} minLength={8} />
            </div>
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>{a.cancel}</Button>
            <CreateSubmitButton label={a.submit} pendingLabel={a.submitting} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CreateSubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

