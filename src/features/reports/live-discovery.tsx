"use client";

import Link from "next/link";
import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { useLocale } from "@/features/i18n/use-locale";
import type { DiscoveryResult } from "./discovery-module";
import { publicStatuses } from "./public-projection";
import { reportStatusLabel, formatManilaDate } from "./report-presentation";
import { discoveryCopy } from "./discovery-copy";

const CommunityMap = lazy(() => import("./community-map"));
export type DiscoveryCategory = { id: string; label: { en: string; fil: string }; active: boolean };
export type DiscoveryPayload = DiscoveryResult & { categories: DiscoveryCategory[] };
function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener("discovery-url", listener);
  return () => { window.removeEventListener("popstate", listener); window.removeEventListener("discovery-url", listener); };
}
function changeUrl(params: URLSearchParams) {
  window.history.pushState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}#reports`);
  window.dispatchEvent(new Event("discovery-url"));
}

export function LiveDiscovery() {
  const { locale } = useLocale(), copy = discoveryCopy[locale];
  const search = useSyncExternalStore(subscribe, () => window.location.search, () => "");
  const params = new URLSearchParams(search), view = params.get("view") === "map" ? "map" : "list";
  const dataParams = new URLSearchParams(search);
  // Map and list are two presentations of exactly the same response page.
  dataParams.delete("view");
  const query = dataParams.toString();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ query: string; attempt: number; data?: DiscoveryPayload; error?: string }>();
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    fetch(`/api/public-reports?${query}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(response.status === 403 ? "DENIED" : data.code ?? "UNAVAILABLE");
        if (!Array.isArray(data.reports) || !Array.isArray(data.categories)) throw new Error("UNAVAILABLE");
        if (!disposed) setResult({ query, attempt, data });
      }).catch((error) => {
        if (!disposed) setResult({ query, attempt, error: error instanceof Error ? error.message : "UNAVAILABLE" });
      }).finally(() => window.clearTimeout(timeout));
    return () => { disposed = true; window.clearTimeout(timeout); controller.abort(); };
  }, [query, attempt]);
  const current = result?.query === query && result.attempt === attempt ? result : undefined;
  const data = current?.data;
  const categories = result?.data?.categories ?? [];
  function filter(name: string, value: string) {
    const next = new URLSearchParams(search);
    if (value === "all") next.delete(name); else next.set(name, value);
    if (name !== "view" && name !== "page") next.delete("page");
    changeUrl(next);
  }
  const error = current?.error;
  return <>
    <noscript><p>{copy.noScript}</p></noscript>
    <div className="discovery-toolbar" aria-label={copy.filters}>
      <div className="view-switch" role="group" aria-label={copy.views}>
        <button type="button" aria-pressed={view === "list"} onClick={() => filter("view", "list")}>{copy.list}</button>
        <button type="button" aria-pressed={view === "map"} onClick={() => filter("view", "map")}>{copy.map}</button>
      </div>
      <label>{copy.category}<select aria-label={copy.category} value={params.get("category") ?? "all"} onChange={(event) => filter("category", event.target.value)}>
        <option value="all">{copy.all}</option>
        {categories.map((category) => <option key={category.id} value={category.id}>{category.label[locale]}</option>)}
        {params.has("category") && !categories.some((category) => category.id === params.get("category")) && <option value={params.get("category")!}>{params.get("category")}</option>}
      </select></label>
      <label>{copy.status}<select aria-label={copy.status} value={params.get("status") ?? "all"} onChange={(event) => filter("status", event.target.value)}>
        <option value="all">{copy.all}</option>{publicStatuses.filter(status => status !== "Assigned").map((status) => <option key={status} value={status}>{reportStatusLabel(status, locale)}</option>)}
      </select></label>
      <label>{copy.date}<select aria-label={copy.date} value={params.get("date") ?? "all"} onChange={(event) => filter("date", event.target.value)}>
        <option value="all">{copy.anyTime}</option>{[7, 30].map((days) => <option key={days} value={days}>{days} {copy.days}</option>)}
      </select></label>
      <label>{copy.distance}<select aria-label={copy.distance} value={params.get("distance") ?? "all"} onChange={(event) => filter("distance", event.target.value)}>
        <option value="all">{copy.area}</option><option value="1">1 km</option><option value="3">3 km</option>
      </select></label>
      <button className="button button-quiet" type="button" onClick={() => changeUrl(new URLSearchParams())}>{copy.clear}</button>
    </div>
    <p className="discovery-note">{copy.privacy}</p>
    <p className="results-count" role="status" aria-live="polite">{!current ? copy.loading : data ? `${data.total} ${copy.count} · ${copy.page} ${data.page} ${copy.of} ${data.pages}` : ""}</p>
    {data?.mode === "demo" && <p className="privacy-note" role="status">{copy.demo}</p>}
    {error && <div className="form-error" role="alert"><p>{error === "VALIDATION" ? copy.invalid : error === "CAPACITY" ? copy.capacity : error === "DENIED" ? copy.denied : copy.unavailable}</p><button type="button" className="button button-quiet" onClick={() => setAttempt(attempt + 1)}>{copy.retry}</button></div>}
    {data && <div aria-busy={!current}>
      {view === "map" && <><Suspense fallback={<p role="status">{copy.mapLoading}</p>}><CommunityMap reports={data.reports} locale={locale} /></Suspense><p className="discovery-note">{copy.unmapped}</p></>}
      <div className="report-grid" aria-label={copy.listLabel}>
        {data.reports.map((report) => <article className="report-card" id={`report-${report.reference}`} key={report.reference}>
          <div className="report-card__topline"><span>{categories.find((category) => category.id === report.category)?.label[locale] ?? report.category}</span><span className="status status-progress">{reportStatusLabel(report.status, locale)}</span></div>
          <h3><Link href={`/reports/${report.reference}`}>{report.publicSummary}</Link></h3>
          <p className="report-place">{report.publicArea}</p>
          <footer><span>{report.reference}</span><time dateTime={report.submittedAt}>{formatManilaDate(report.submittedAt, locale)}</time></footer>
          <Link className="text-link" href={`/reports/${report.reference}`}>{copy.detail}</Link>
        </article>)}
      </div>
      {data.total === 0 && <p className="empty-state">{copy.empty}</p>}
      {data.pages > 1 && <nav className="discovery-pagination" aria-label={locale === "fil" ? "Mga pahina ng ulat" : "Report pages"}>
        <button type="button" className="button button-quiet" disabled={data.page === 1} onClick={() => filter("page", String(data.page - 1))}>{copy.previous}</button>
        <span>{copy.page} {data.page} {copy.of} {data.pages}</span>
        <button type="button" className="button button-quiet" disabled={data.page === data.pages} onClick={() => filter("page", String(data.page + 1))}>{copy.next}</button>
      </nav>}
    </div>}
  </>;
}
