"use client";
import Link from "next/link";
export default function AdministrationError({ reset }: { reset: () => void }) {
  return (
    <main className="admin-shell">
      <h1>Administration unavailable / Hindi mabuksan ang pamamahala</h1>
      <p role="alert">
        Check your connection and retry. / Suriin ang koneksyon at subukang
        muli.
      </p>
      <button className="button button-primary" onClick={reset}>
        Retry / Subukang muli
      </button>{" "}
      <Link href="/account">Account</Link>
    </main>
  );
}
