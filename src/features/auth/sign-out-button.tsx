"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function signOut() {
    setPending(true);
    await fetch("/api/session", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }
  return <button className="button button-dark" type="button" disabled={pending} onClick={signOut}>{pending ? "Signing out…" : "Sign out"}</button>;
}
