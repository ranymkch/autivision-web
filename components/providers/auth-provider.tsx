"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { AppRole } from "@/lib/rbac";

interface AuthCtx {
  isAuthenticated: boolean;
  email: string | null;
  username: string | null;
  role: AppRole | null;
}

const Ctx = createContext<AuthCtx>({
  isAuthenticated: false,
  email: null,
  username: null,
  role: null,
});

export function AuthProvider({
  value,
  children,
}: {
  value: AuthCtx;
  children: ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
