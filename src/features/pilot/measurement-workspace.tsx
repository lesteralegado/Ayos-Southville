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
  const [snapshot, setSnapshot] = useState<MeasurementSnapshot | null>(null), [pending, setPending] = useState(false), [uncertain, setUncertain] = useState(true), [notice, setNotice] = useState(false), [error, setError] = useState<"forbidden" | "unavailable" | "interrupted" | "invalid" | "conflict" | "" >("");
  const refresh = useCallback(async () => {
    setPending(true); setError("");
    try { const response = await fetch("/api/pilot-measurement", { cache: "no-store" }); if (!response.ok) { setUncertain(true); setError([401,403].includes(response.status) ? "forbidden" : "unavailable"); return; } setSnapshot(await response.json()); setUncertain(false); }
    catch { setUncertain(true); setError("unavailable"); } finally { setPending(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  async function save(input: Record<string, unknown>) {
    setPending(true); setUncertain(true); setNotice(false); setError("");
    try {
      const response = await fetch("/api/pilot-measurement", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      if (!response.ok) { const status = response.status; setError([401,403].includes(status) ? "forbidden" : status === 409 ? "conflict" : status === 422 ? "invalid" : "interrupted"); if (status === 422) setUncertain(false); return; }
      const latest = await fetch("/api/pilot-measurement", { cache: "no-store" });
      if (!latest.ok) throw new Error("Unconfirmed refresh");
      setSnapshot(await latest.json()); setUncertain(false); setNotice(true);
    } catch { setError("interrupted"); } finally { setPending(false); }
  }
  return <main className="admin-page measurement-page"><header className="composer-header"><Link className="brand" href="/">Ayos Southville</Link><div className="admin-header-actions"><Link href="/administration">{copy.admin}</Link><button className="language-button" onClick={() => chooseLocale(locale === "en" ? "fil" : "en")}>{locale === "en" ? "Filipino" : "English"}</button></div></header><div className="admin-shell">
    <h1>{copy.title}</h1><p className="admin-intro">{copy.intro}</p><nav className="admin-section-nav" aria-label={copy.title}><a href="#findings">{copy.record}</a><a href="#trial">{copy.trial}</a><button className="button button-quiet" disabled={pending} onClick={() => void refresh()}>{copy.refresh}</button></nav>
    <p role="status" aria-live="polite">{pending ? copy.loading : notice ? copy.saved : ""}</p>{error && <p className="admin-error" role="alert">{copy[error]}</p>}
    {snapshot && <><p className="admin-intro">{copy.denominator}</p>{(["real", "exercise", "unknown"] as MeasurementSource[]).map(source => { const summary = snapshot.summary[source]; return <section className="admin-section measurement-summary" key={source}><h2>{copy[source]}</h2><p>{copy.participants}: {summary.participants} · {copy.unassisted}: {summary.unassistedSubmissionRate === null ? copy.uncollected : `${summary.unassistedSubmissionRate}%`}</p>{source === "real" && <p role="status">{!summary.sampleSufficient ? copy.insufficient : summary.submissionTargetMet ? copy.met : copy.missed}</p>}{!summary.participants && <p>{copy.empty}</p>}<dl>{(["statusComprehensionRate", "duplicateDiscoveryRate", "lifecycleCompletionRate"] as const).map((field, index) => <div key={field}><dt>{copy[(["understoodStatus", "foundDuplicate", "completedLifecycle"] as const)[index]]}</dt><dd>{summary[field] === null ? copy.uncollected : `${summary[field]}%`} · {copy.uncollected}: {summary.uncollected[(["understoodStatus", "foundDuplicate", "completedLifecycle"] as const)[index]]}</dd></div>)}</dl></section>; })}</>}
    {snapshot && <MeasurementFindingForm key={snapshot.records.map(record => `${record.source}-${record.participantCode}:${record.revision}`).join("|")} records={snapshot.records} locale={locale} pending={pending || uncertain} save={save} />}
    {snapshot && <MeasurementTrialForm key={snapshot.trial?.revision ?? 0} trial={snapshot.trial} locale={locale} pending={pending || uncertain} save={save} />}
  </div></main>;
}
