import { redirect } from "next/navigation";

/** OTP verify step removed — magic link flow handles auth via /auth/callback. */
export default function VerifyPage() {
  redirect("/login");
}
