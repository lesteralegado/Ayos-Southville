"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useLocale } from "@/features/i18n/use-locale";
import type { createPilotMeasurement, MeasurementSource } from "./pilot-measurement";
import { measurementCopy } from "./measurement-copy";
import { MeasurementFindingForm } from "./measurement-finding-form";
import { MeasurementTrialForm } from "./measurement-trial-form";
export type MeasurementSnapshot = Awaited<ReturnType<ReturnType<typeof createPilotMeasurement>["read"]>>;
export function MeasurementWorkspace() {
  const { locale, chooseLocale } = useLocale(), copy = measurementCopy[locale];
  const [snapshot, setSnapshot] = useState<MeasurementSnapshot | null>(null), [pending, setPending] = useState(true), [uncertain, setUncertain] = useState(true), [notice, setNotice] = useState(false), [error, setError] = useState<"forbidden" | "unavailable" | "interrupted" | "invalid" | "conflict" | "" >("");
  const refresh = useCallback(async () => {
    try { const response = await fetch("/api/pilot-measurement", { cache: "no-store" }); if (!response.ok) { setUncertain(true); if ([401,403].includes(response.status)) setSnapshot(null); setError([401,403].includes(response.status) ? "forbidden" : "unavailable"); return; } setSnapshot(await response.json()); setUncertain(false); }
    catch { setUncertain(true); setError("unavailable"); } finally { setPending(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/pilot-measurement", { cache: "no-store", signal: controller.signal }).then(async response => {
      const data = response.ok ? await response.json() : null;
      if (controller.signal.aborted) return;
      if (response.ok) { setSnapshot(data); setUncertain(false); }
      else { setError([401,403].includes(response.status) ? "forbidden" : "unavailable"); }
    }).catch(() => { if (!controller.signal.aborted) setError("unavailable"); }).finally(() => { if (!controller.signal.aborted) setPending(false); });
    return () => controller.abort();
  }, []);
  async function save(input: Record<string, unknown>) {
    setPending(true); setUncertain(true); setNotice(false); setError("");
    try {
      const response = await fetch("/api/pilot-measurement", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      if (!response.ok) { const status = response.status; if ([401,403].includes(status)) setSnapshot(null); setError([401,403].includes(status) ? "forbidden" : status === 409 ? "conflict" : status === 422 ? "invalid" : "interrupted"); if (status === 422) setUncertain(false); return; }
      const latest = await fetch("/api/pilot-measurement", { cache: "no-store" });
      if ([401,403].includes(latest.status)) { setSnapshot(null); setError("forbidden"); return; }
      if (!latest.ok) throw new Error("Unconfirmed refresh");
      setSnapshot(await latest.json()); setUncertain(false); setNotice(true);
    } catch { setError("interrupted"); } finally { setPending(false); }
  }
  return <main className="admin-page measurement-page"><header className="composer-header"><Link className="brand" href="/">Ayos Southville</Link><div className="admin-header-actions"><Link href="/administration">{copy.admin}</Link><button className="language-button" onClick={() => chooseLocale(locale === "en" ? "fil" : "en")}>{locale === "en" ? "Filipino" : "English"}</button></div></header><div className="admin-shell">
    <h1>{copy.title}</h1><p className="admin-intro">{copy.intro}</p><nav className="admin-section-nav" aria-label={copy.title}><a href="#findings">{copy.record}</a><a href="#trial">{copy.trial}</a><button className="button button-quiet" disabled={pending} onClick={() => { setPending(true); setNotice(false); setUncertain(true); setError(""); void refresh(); }}>{copy.refresh}</button></nav>
    <p role="status" aria-live="polite">{pending ? copy.loading : notice ? copy.saved : ""}</p>{error && <p className="admin-error" role="alert">{copy[error]}</p>}
    {snapshot && <>{uncertain && <p role="status">{copy.stale}</p>}<p className="admin-intro">{copy.denominator}</p>{(["real", "exercise", "unknown"] as MeasurementSource[]).map(source => { const summary = snapshot.summary[source]; return <section className="admin-section measurement-summary" key={source}><h2>{copy[source]}</h2><p>{copy.participants}: {summary.participants} · {copy.unassisted}: {summary.unassistedSubmissionRate === null ? copy.uncollected : `${summary.unassistedSubmissionRate}%`}</p>{source === "real" && !uncertain && <p role="status">{!summary.sampleSufficient ? copy.insufficient : summary.submissionTargetMet ? copy.met : copy.missed}</p>}{!summary.participants && <p>{copy.empty}</p>}<dl>{(["statusComprehensionRate", "duplicateDiscoveryRate", "lifecycleCompletionRate"] as const).map((field, index) => <div key={field}><dt>{copy[(["understoodStatus", "foundDuplicate", "completedLifecycle"] as const)[index]]}</dt><dd>{summary[field] === null ? copy.uncollected : `${summary[field]}%`} · {copy.uncollected}: {summary.uncollected[(["understoodStatus", "foundDuplicate", "completedLifecycle"] as const)[index]]}</dd></div>)}</dl></section>; })}</>}
    {snapshot && <MeasurementFindingForm key={snapshot.records.map(record => `${record.source}-${record.participantCode}:${record.revision}`).join("|")} records={snapshot.records} locale={locale} pending={pending || uncertain} save={save} />}
    {snapshot && <MeasurementTrialForm key={snapshot.trial?.revision ?? 0} trial={snapshot.trial} locale={locale} pending={pending || uncertain} save={save} />}
  </div></main>;
}
