"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/features/i18n/use-locale";

export function SignOutButton() {
  const router = useRouter();
  const { locale } = useLocale();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function signOut() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/session", { method: "DELETE" });
      if (!response.ok) throw new Error("Sign out failed");
      router.push("/");
      router.refresh();
    } catch {
      setError(locale === "fil" ? "Hindi makapag-sign out. Subukan muli." : "Could not sign out. Try again.");
      setPending(false);
    }
  }
  const label = pending ? (locale === "fil" ? "Nagsa-sign out…" : "Signing out…") : (locale === "fil" ? "Mag-sign out" : "Sign out");
  return <><p className="form-error" role="alert" aria-live="polite">{error}</p><button className="button button-dark" type="button" disabled={pending} onClick={signOut}>{label}</button></>;
}
