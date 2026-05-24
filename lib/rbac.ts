import type { AppRole } from "@/types/database";

export type { AppRole };

type Permission =
  | "patients:read"
  | "patients:write"
  | "patients:viewIdentity"
  | "screening:run"
  | "questionnaire:run"
  | "reports:view"
  | "reports:generate"
  | "history:view"
  | "settings:view"
  | "admin:manage";

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  doctor: [
    "patients:read",
    "patients:write",
    "patients:viewIdentity",
    "screening:run",
    "questionnaire:run",
    "reports:view",
    "reports:generate",
    "history:view",
    "settings:view",
  ],
  admin: [
    "admin:manage",
  ],
};

export function can(role: AppRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function isAppRole(value: string | null | undefined): value is AppRole {
  return value === "doctor" || value === "admin";
}

export const ROLE_NAV_HREFS: Record<AppRole, string[]> = {
  doctor: [
    "/app/dashboard",
    "/app/patients",
    "/app/screening",
    "/app/questionnaire",
    "/app/reports",
    "/app/history",
    "/app/settings",
  ],
  admin: [
    "/app/dashboard",
    "/app/admin/users",
    "/app/admin/history",
  ],
};
