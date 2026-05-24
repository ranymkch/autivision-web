"use client";

import { useTransition } from "react";
import { changeRole } from "./actions";
import { toast } from "sonner";
import type { AppRole } from "@/lib/rbac";

const ROLES: { value: AppRole; label: string }[] = [
  { value: "doctor", label: "Doctor" },
  { value: "admin",  label: "Admin"  },
];

export function ChangeRoleButton({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const role = e.target.value as AppRole;
    if (!role || role === currentRole) return;
    startTransition(async () => {
      const result = await changeRole(userId, role);
      if (result.error) toast.error(result.error);
      else toast.success(`Role updated to ${role}.`);
    });
  }

  return (
    <select
      defaultValue={currentRole ?? ""}
      onChange={handleChange}
      disabled={isPending}
      className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground disabled:opacity-50"
    >
      <option value="" disabled>Change role…</option>
      {ROLES.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  );
}
