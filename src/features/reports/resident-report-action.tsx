"use client";
import { useRef, useState } from "react";
import { useLocale } from "@/features/i18n/use-locale";
import { residentFlowCopy } from "./resident-flow-copy";

export function ResidentReportAction({ reference, submitted, requested = false, onWithdraw, eligible = true }: { reference: string; submitted: boolean; requested?: boolean; eligible?: boolean; onWithdraw(): void }) {
  const { locale } = useLocale(), copy = residentFlowCopy[locale];
  const [confirmed, setConfirmed] = useState(false), [pending, setPending] = useState(false), [done, setDone] = useState(requested), [error, setError] = useState("");
  const locked = useRef(false);
  async function change() {
    if (!confirmed || locked.current) return;
    locked.current = true; setPending(true); setError("");
    try {
      const response = await fetch(`/api/reports/${reference}/request`, { method: "POST", signal: AbortSignal.timeout(20000), headers: { "content-type": "application/json" }, body: JSON.stringify({ action: submitted ? "withdraw" : "request-archive", confirmed: true }) });
      if (!response.ok) { setError(response.status === 409 ? copy.conflict : [401,403,404].includes(response.status) ? copy.forbidden : copy.failed); return; }
      setDone(true); window.dispatchEvent(new Event("ayos-updates-changed"));
      if (submitted) { window.dispatchEvent(new CustomEvent("ayos-report-withdrawn", { detail: { reference } })); onWithdraw(); }
    } catch { setError(copy.failed); }
    finally { locked.current = false; setPending(false); }
  }
  if (!eligible) return null;
  return <div className="resident-report-action">
    {done ? <p role="status">{submitted ? copy.withdrawn : copy.requested}</p> : <details>
      <summary>{submitted ? copy.withdraw : copy.removal}</summary>
      <p>{submitted ? copy.confirmWithdraw : copy.confirmRemoval}</p>
      <label><input type="checkbox" checked={confirmed} disabled={pending} onChange={event => setConfirmed(event.target.checked)} />{copy.confirm}</label>
      <button className="button button-quiet" type="button" disabled={!confirmed || pending} onClick={() => void change()}>{pending ? copy.saving : error ? copy.retry : submitted ? copy.withdraw : copy.removal}</button>
      {error && <p role="alert">{error}</p>}
    </details>}
  </div>;
}
