"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/features/i18n/use-locale";
import type { DeletionRequest } from "./privacy-module";
import { privacyCopy } from "./privacy-copy";
type Mode = "policy" | "resident" | "administrator";
type Data = { request?: DeletionRequest | null; requests?: DeletionRequest[]; pilotEndedAt?: string | null; cleanupEnabled?: boolean;
  runs?: { mode: string; occurredAt: string; eligible: number; removed: number; status: string }[] };
type Notice = "" | "failure" | "permission" | "validation" | "continuity" | "conflict" | "limited";
function errorNotice(status: number, code: string): Notice {
  if (code === "ADMIN_CONTINUITY") return "continuity";
  if (status === 401 || status === 403) return "permission";
  if (status === 422) return "validation";
  if (status === 409) return "conflict";
  return status === 429 ? "limited" : "failure";
}
async function privateRequest(url: string, signal: AbortSignal, body?: object) {
  const response = await fetch(url, { cache: "no-store", signal, ...(body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const value = await response.json();
  if (!response.ok) throw new Error(errorNotice(response.status, value.code));
  return value as Data;
}
export function PrivacyWorkspace({ mode }: { mode: Mode }) {
  const { locale, chooseLocale } = useLocale(), copy = privacyCopy[locale];
  const [data, setData] = useState<Data>({}), [loading, setLoading] = useState(mode !== "policy"), [pending, setPending] = useState(false);
  const [attempt, setAttempt] = useState(0), [notice, setNotice] = useState<Notice>(""), [saved, setSaved] = useState(false);
  const [confirmed, setConfirmed] = useState(false), [date, setDate] = useState(""), [endConfirmed, setEndConfirmed] = useState(false);
  const endpoint = mode === "administrator" ? "/api/operations" : "/api/privacy";
  useEffect(() => {
    if (mode === "policy") return;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    let active = true;
    privateRequest(endpoint, controller.signal).then(value => { if (active) { setData(value); setNotice(""); } })
      .catch(error => { if (active) setNotice(["permission", "validation", "conflict", "limited"].includes(error.message) ? error.message : "failure"); })
      .finally(() => { clearTimeout(timer); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [endpoint, mode, attempt]);
  async function mutate(body: object) {
    setPending(true); setNotice(""); setSaved(false);
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 110000);
    try { setData(await privateRequest(endpoint, controller.signal, body)); setSaved(true); }
    catch (error) { const message = error instanceof Error ? error.message : "failure"; setNotice(["permission", "validation", "continuity", "conflict", "limited"].includes(message) ? message as Notice : "failure"); }
    finally { clearTimeout(timer); setPending(false); }
  }
  const format = (value: string) => Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat(locale === "fil" ? "fil-PH" : "en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(value)) : "—";
  const status = (request: DeletionRequest) => copy[request.status];
  return <main className="privacy-page">
    <header className="privacy-nav"><Link href="/">{copy.home}</Link><Link href={mode === "administrator" ? "/administration" : "/account"}>{mode === "administrator" ? copy.admin : copy.account}</Link>
      <label>{copy.language}<select value={locale} onChange={event => chooseLocale(event.target.value === "fil" ? "fil" : "en")}><option value="en">English</option><option value="fil">Filipino</option></select></label></header>
    <h1>{mode === "administrator" ? copy.operations : copy.title}</h1><p className="privacy-intro">{copy.intro}</p>
    <section aria-labelledby="retention-title"><h2 id="retention-title">{copy.retention}</h2><dl className="retention-ledger">{copy.periods.map(([label, text]) => <div key={label}><dt>{label}</dt><dd>{text}</dd></div>)}</dl><p>{copy.exceptions}</p></section>
    {mode === "policy" ? <Link className="button button-primary" href="/account/privacy">{copy.policyAction}</Link> : <>
      <div className="privacy-feedback"><p role="status" aria-live="polite">{loading ? copy.loading : pending ? copy.saving : saved ? copy.saved : ""}</p>
        {notice && <p id="privacy-error" role="alert">{copy[notice]}</p>}<button className="button button-quiet" disabled={pending || loading} onClick={() => { setLoading(true); setSaved(false); setAttempt(value => value + 1); }}>{copy.retry}</button></div>
      {mode === "resident" ? <section aria-labelledby="deletion-title" aria-busy={pending || loading}>
        <h2 id="deletion-title">{copy.deletion}</h2><p>{copy.explanation}</p>
        {!loading && data.request ? <p className="privacy-receipt">{copy.receipt}: <strong>{status(data.request)}</strong><br /><time dateTime={data.request.requestedAt}>{format(data.request.requestedAt)}</time></p> : !loading && !notice ? <p>{copy.noRequest}</p> : null}
        {(!data.request || data.request.status === "cancelled") && <form onSubmit={event => { event.preventDefault(); void mutate({ confirmed }); }}>
          <label className="privacy-check"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={pending || loading} />{copy.confirm}</label>
          <button className="button button-dark" disabled={!confirmed || pending || loading || notice === "permission"}>{copy.deletion}</button>
        </form>}
      </section> : <>
        <section aria-labelledby="queue-title" aria-busy={pending || loading}><h2 id="queue-title">{copy.queue}</h2><p>{copy.queueHelp}</p>
          {!loading && !data.requests?.length && !notice && <p>{copy.noQueue}</p>}
          <ul className="privacy-requests">{data.requests?.map(request => <li key={request.id}><strong>{status(request)}</strong><time dateTime={request.requestedAt}>{format(request.requestedAt)}</time>
            {request.residentUid && <p>{copy.privateRef}: {request.residentUid}</p>}
            {request.status === "requested" && <div className="privacy-actions"><button className="button button-dark" disabled={pending} onClick={() => void mutate({ action: "review", id: request.id, status: "approved" })}>{copy.approve}</button><button className="button button-quiet" disabled={pending} onClick={() => void mutate({ action: "review", id: request.id, status: "cancelled" })}>{copy.cancel}</button></div>}
          </li>)}</ul>
        </section>
        <section aria-labelledby="cleanup-title"><h2 id="cleanup-title">{copy.cleanup}</h2><p>{data.cleanupEnabled ? copy.enabled : copy.disabled}</p><button className="button button-dark" disabled={pending || loading || notice === "permission"} onClick={() => void mutate({ action: "preview-cleanup" })}>{copy.preview}</button>
          {!data.runs?.length && !loading && <p>{copy.noRuns}</p>}<ul className="privacy-runs">{data.runs?.map((run, index) => <li key={`${run.occurredAt}-${index}`}><strong>{run.mode === "apply" ? copy.apply : copy.dryRun}</strong> · <time dateTime={run.occurredAt}>{format(run.occurredAt)}</time><p>{copy.eligible}: {run.eligible} · {copy.removed}: {run.removed}{run.status === "failed" ? ` · ${copy.failed}` : run.status === "partial" ? ` · ${copy.partial}` : ""}</p></li>)}</ul>
        </section>
        <section aria-labelledby="pilot-end-title"><h2 id="pilot-end-title">{copy.end}</h2>{data.pilotEndedAt ? <p>{copy.ended}: <time dateTime={data.pilotEndedAt}>{format(data.pilotEndedAt)}</time></p> : <form onSubmit={event => { event.preventDefault(); void mutate({ action: "pilot-end", date, confirmed: endConfirmed }); }}><p id="pilot-end-help">{copy.endHelp}</p><label htmlFor="pilot-end-date">{copy.date}</label><input id="pilot-end-date" type="date" required value={date} onChange={event => { setDate(event.target.value); setNotice(""); }} aria-invalid={notice === "validation"} aria-describedby={notice === "validation" ? "pilot-end-help privacy-error" : "pilot-end-help"} disabled={pending || loading} />
          <label className="privacy-check"><input type="checkbox" checked={endConfirmed} onChange={event => setEndConfirmed(event.target.checked)} disabled={pending || loading} />{copy.endConfirm}</label><button className="button button-dark" disabled={!date || !endConfirmed || pending || loading || notice === "permission"}>{copy.recordEnd}</button></form>}</section>
      </>}
    </>}
  </main>;
}
