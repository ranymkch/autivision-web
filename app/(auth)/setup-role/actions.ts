"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  role: z.enum(["doctor"]),
  next: z.string().optional().nullable(),
});

export type SetupRoleState = { error?: string };

export async function saveRole(
  _prev: SetupRoleState,
  formData: FormData
): Promise<SetupRoleState> {
  const parsed = schema.safeParse({
    role: formData.get("role"),
    next: formData.get("next"),
  });
  if (!parsed.success) {
    return { error: "Please select a valid role." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", user.id);

  if (error) return { error: error.message };

  const next =
    parsed.data.next && parsed.data.next.startsWith("/")
      ? parsed.data.next
      : "/app/dashboard";

  redirect(next);
}
