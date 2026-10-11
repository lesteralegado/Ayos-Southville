"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useLocale } from "@/features/i18n/use-locale";
import { reportStatusLabels } from "@/features/reports/report-presentation";
import { discoveryCopy } from "@/features/reports/discovery-copy";
import type { DiscoveryCategory } from "@/features/reports/live-discovery";
import type { ReportStatus } from "@/features/reports/report-module";
import type { PilotInsights } from "./pilot-insights";

type Payload = { insights: PilotInsights; categories: DiscoveryCategory[]; mode: "live" | "demo" };
export function PublicInsights() {
  const { locale, chooseLocale } = useLocale(), fil = locale === "fil", copy = discoveryCopy[locale];
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ attempt: number; data?: Payload; error?: string }>();
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    fetch("/api/insights", { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok || !data.insights) throw new Error(data.code ?? "UNAVAILABLE");
      if (!disposed) setResult({ attempt, data });
    }).catch((error) => { if (!disposed) setResult({ attempt, error: error instanceof Error ? error.message : "UNAVAILABLE" }); })
      .finally(() => window.clearTimeout(timeout));
    return () => { disposed = true; window.clearTimeout(timeout); controller.abort(); };
  }, [attempt]);
  const current = result?.attempt === attempt ? result : undefined, data = current?.data, insights = data?.insights;
  const hours = (value: number | null) => value === null ? (fil ? "Wala pang sapat na datos" : "Not enough data") : `${new Intl.NumberFormat(fil ? "fil-PH" : "en-PH", { maximumFractionDigits: 1 }).format(value)} ${fil ? "oras" : "hours"}`;
  return <main className="account-page public-insights-page">
    <header className="composer-header"><Link className="brand" href="/">Ayos Southville</Link><button className="language-button" type="button" onClick={() => chooseLocale(fil ? "en" : "fil")}>{fil ? "English" : "Filipino"}</button></header>
    <section>
      <h1>{fil ? "Mga resulta ng komunidad" : "Community insights"}</h1>
      <p>{fil ? "Independent na pilot na pinangungunahan ng residente. Pinagsama-samang aprubadong ulat lamang; walang detalye ng bahay o ranggo ng operator." : "Independent resident-led pilot. Approved public reports only; no household details or operator rankings."}</p>
      {!current && <p role="status">{copy.loading}</p>}
      {current?.error && <div className="form-error" role="alert"><p>{current.error === "CAPACITY" ? copy.capacity : copy.unavailable}</p><button className="button button-quiet" type="button" onClick={() => setAttempt(value => value + 1)}>{copy.retry}</button></div>}
      {data?.mode === "demo" && <p className="privacy-note">{copy.demo}</p>}
      {insights && <>
        <dl className="report-meta">
          <div><dt>{fil ? "Aprubadong mga ulat" : "Approved reports"}</dt><dd>{insights.totals.all}</dd></div>
          <div><dt>{fil ? "Median ng unang tugon" : "Median first response"}</dt><dd>{hours(insights.medianFirstResponseHours)}</dd></div>
          <div><dt>{fil ? "Median ng unang resolusyon" : "Median first resolution"}</dt><dd>{hours(insights.medianResolutionHours)}</dd></div>
          <div><dt>{fil ? "Kinumpirma ng residente" : "Resident confirmed"}</dt><dd>{insights.residentConfirmed}</dd></div>
        </dl>
        <div className="insights-definitions"><p>{fil ? "Saklaw: lahat ng kasalukuyang aprubadong pampublikong ulat, hindi lamang ang pahina o filter sa homepage. Hindi kasama ang pribado, tinanggihan, at duplikadong ulat." : "Scope: all currently approved public reports, not just the homepage page or filters. Private, rejected, and duplicate reports are excluded."}</p>
          <p>{fil ? "Ang mga median ay mula sa oras ng pagsusumite hanggang sa unang pampublikong pagsusuri o unang resolusyong iniulat ng operator. Kasama lamang ang mga ulat na may wastong kaukulang oras. Ang unang resolusyon ay hindi nangangahulugang kinumpirma ng residente; maaaring muling buksan ang ulat." : "Medians measure elapsed time from submission to the first public review or first operator-claimed resolution, using only reports with valid corresponding timestamps. First resolution is not resident confirmation; a report may be reopened."}</p>
          <p>{fil ? "Ipinapakita lamang ang isang pampublikong lugar kapag may hindi bababa sa 3 aprubadong ulat. Bilang ito ng ulat, hindi ng natatanging residente. Ang pagkumpirma ay kasalukuyang katayuan, hindi kabuuang kasaysayan." : "Public areas appear only with at least 3 approved reports. This counts reports, not distinct residents. Resident confirmation counts the current status, not historical confirmations."}</p>
        </div>
        <h2>{fil ? "Mga paulit-ulit na pampublikong lugar" : "Recurring public areas"}</h2>
        {insights.recurringAreas.length ? <ul>{insights.recurringAreas.map(area => <li key={area.area}>{area.area}: {area.reports}</li>)}</ul> : <p className="empty-state">{fil ? "Wala pang lugar na umabot sa pamantayan ng privacy." : "No area meets the privacy threshold yet."}</p>}
        <h2>{fil ? "Bilang ayon sa kategorya" : "Totals by category"}</h2>
        <ul>{Object.entries(insights.totals.byCategory).map(([id, total]) => <li key={id}>{data!.categories.find(category => category.id === id)?.label[locale] ?? id}: {total}</li>)}</ul>
        <h2>{fil ? "Bilang ayon sa katayuan" : "Totals by status"}</h2>
        <ul>{Object.entries(insights.totals.byStatus).map(([status, total]) => <li key={status}>{reportStatusLabels[locale][status as ReportStatus]}: {total}</li>)}</ul>
      </>}
    </section>
  </main>;
}
