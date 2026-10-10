"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { messages, type Locale } from "@/features/i18n/messages";
import { useLocale } from "@/features/i18n/use-locale";
import { listPublicReports, type PublicReport } from "@/features/reports/public-reports";

const statusClass: Record<PublicReport["status"], string> = {
  "Under review": "status-review",
  Assigned: "status-assigned",
  "In progress": "status-progress",
};

const reportTranslations: Record<Locale, Record<string, Partial<PublicReport>>> = {
  en: {},
  fil: {
    "AS-1042": { title: "Baradong kanal pagkatapos ng malakas na ulan", category: "Roads & drainage", publicArea: "Phase 2 · Lugar ng covered court", status: "In progress", summary: "May naiiwang tubig sa daanan pagkatapos ng ulan." },
    "AS-1038": { title: "Patay na ilaw sa kalsada tuwing gabi", category: "Streetlights", publicArea: "Phase 1 · Pangunahing kalsada", status: "Assigned", summary: "Tatlong gabi nang patay ang ilaw malapit sa tawiran." },
    "AS-1031": { title: "Hindi nakolektang basura", category: "Waste collection", publicArea: "Phase 3 · Silangang pasukan", status: "Under review", summary: "May ilang collection point na hindi nadaanan sa regular na ruta." },
  },
};

const categoryLabels: Record<Locale, Record<PublicReport["category"], string>> = {
  en: { "Roads & drainage": "Roads & drainage", Streetlights: "Streetlights", "Waste collection": "Waste collection" },
  fil: { "Roads & drainage": "Kalsada at kanal", Streetlights: "Ilaw sa kalsada", "Waste collection": "Koleksyon ng basura" },
};

const statusLabels: Record<Locale, Record<PublicReport["status"], string>> = {
  en: { "Under review": "Under review", Assigned: "Assigned", "In progress": "In progress" },
  fil: { "Under review": "Sinusuri", Assigned: "Naitalaga", "In progress": "Inaayos" },
};

function Mark() {
  return <span className="mark" aria-hidden="true"><svg viewBox="0 0 36 36"><path d="M7 19.5 14.5 27 29 10.5" /></svg></span>;
}

function ReportCard({ report, locale, affectedLabel }: { report: PublicReport; locale: Locale; affectedLabel: string }) {
  const translated = { ...report, ...reportTranslations[locale][report.id] };
  return (
    <article className="report-card">
      <div className="report-card__topline">
        <span className="eyebrow">{categoryLabels[locale][report.category]}</span>
        <span className={`status ${statusClass[report.status]}`}>{statusLabels[locale][report.status]}</span>
      </div>
      <h3>{translated.title}</h3>
      <p className="report-summary">{translated.summary}</p>
      <div className="report-place"><span aria-hidden="true">⌖</span>{translated.publicArea}</div>
      <footer><span>{report.id}</span><span>{report.affectedResidents} {affectedLabel}</span></footer>
    </article>
  );
}

export default function HomePage() {
  const { locale, chooseLocale } = useLocale();
  const copy = messages[locale];
  const discovery = locale === "fil"
    ? { list: "Listahan", map: "Mapa", category: "Kategorya", status: "Status", date: "Petsa", distance: "Layo", all: "Lahat", anyTime: "Anumang oras", area: "Buong Southville 1", count: "privacy-safe na ulat", empty: "Walang ulat na tumutugma. Alisin ang filter para palawakin ang resulta.", privacy: "Tinatayang lugar lamang. Nananatiling pribado ang eksaktong lokasyon ng bahay." }
    : { list: "List", map: "Map", category: "Category", status: "Status", date: "Date", distance: "Distance", all: "All", anyTime: "Any time", area: "All Southville 1", count: "privacy-safe reports", empty: "No reports match these filters. Clear a filter to widen the view.", privacy: "Approximate areas only. Exact household locations remain private." };
  const [allReports] = useState(listPublicReports);
  const initialParam = (name: string, fallback: string) => typeof window === "undefined" ? fallback : new URLSearchParams(window.location.search).get(name) ?? fallback;
  const [view, setView] = useState<"list" | "map">(() => initialParam("view", "list") === "map" ? "map" : "list");
  const [category, setCategory] = useState(() => initialParam("category", "all"));
  const [status, setStatus] = useState(() => initialParam("status", "all"));
  const [date, setDate] = useState(() => initialParam("date", "all"));
  const [distance, setDistance] = useState(() => initialParam("distance", "all"));
  useEffect(() => {
    const params = new URLSearchParams();
    if (view !== "list") params.set("view", view);
    if (category !== "all") params.set("category", category);
    if (status !== "all") params.set("status", status);
    if (date !== "all") params.set("date", date);
    if (distance !== "all") params.set("distance", distance);
    window.history.replaceState(null, "", `${window.location.pathname}${params.size ? `?${params}` : ""}#reports`);
  }, [view, category, status, date, distance]);
  const reports = useMemo(() => allReports.filter((report) =>
    (category === "all" || report.category === category) &&
    (status === "all" || report.status === status) &&
    (date === "all" || Date.parse(report.reportedAt) >= Date.parse(allReports[0].reportedAt) - Number(date) * 86_400_000) &&
    (distance === "all" || Math.hypot((report.publicLocation.latitude - 14.281) * 111, (report.publicLocation.longitude - 121.127) * 107) <= Number(distance))
  ), [allReports, category, status, date, distance]);

  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Ayos Southville home"><Mark /><span>Ayos Southville</span></Link>
        <nav aria-label="Primary navigation">
          <a href="#reports">{copy.reportsLink}</a>
          <button className="language-button" type="button" onClick={() => chooseLocale(locale === "en" ? "fil" : "en")}>{copy.languageAction}</button>
          <Link className="button button-quiet" href="/sign-in">{copy.signIn}</Link>
          <Link className="button button-dark" href="/register">{copy.join}</Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="pilot-chip"><span className="pulse" /> {copy.chip}</div>
          <h1>{copy.headline} <em>{copy.headlineAccent}</em></h1>
          <p className="hero-lead">{copy.lead}</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/register">{copy.reportAction} <span aria-hidden="true">↗</span></Link>
            <a className="text-link" href="#reports">{copy.browseAction} <span aria-hidden="true">↓</span></a>
          </div>
          <p className="disclosure">{copy.disclosure}</p>
        </div>

        <aside className="hero-panel" aria-label={copy.panelLabel}>
          <span className="panel-kicker">{copy.panelKicker}</span>
          <ol>{copy.steps.map(([title, detail], index) => <li key={title}><span>0{index + 1}</span><div><strong>{title}</strong><p>{detail}</p></div></li>)}</ol>
        </aside>
      </section>

      <section className="report-section" id="reports" aria-labelledby="reports-title">
        <div className="section-heading">
          <div><span className="eyebrow">{copy.neighborhood}</span><h2 id="reports-title">{copy.reportsTitle}</h2></div>
          <p>{copy.privacy}</p>
        </div>
        <div className="discovery-toolbar" aria-label="Report filters">
          <div className="view-switch" role="group" aria-label="View reports as">
            <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>{discovery.list}</button>
            <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>{discovery.map}</button>
          </div>
          <label>{discovery.category}<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">{discovery.all}</option>{Object.entries(categoryLabels[locale]).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label>{discovery.status}<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">{discovery.all}</option>{Object.entries(statusLabels[locale]).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <label>{discovery.date}<select value={date} onChange={(event) => setDate(event.target.value)}><option value="all">{discovery.anyTime}</option><option value="7">7 days</option><option value="30">30 days</option></select></label>
          <label>{discovery.distance}<select value={distance} onChange={(event) => setDistance(event.target.value)}><option value="all">{discovery.area}</option><option value="1">1 km</option><option value="3">3 km</option></select></label>
        </div>
        <p className="results-count" role="status">{reports.length} {discovery.count}</p>
        {view === "map" && <div className="community-map" role="img" aria-label="Approximate report locations in Southville 1">
          <span className="map-road map-road-a" /><span className="map-road map-road-b" />
          {reports.map((report, index) => <a key={report.id} className={`map-marker marker-${index + 1}`} href={`#report-${report.id}`} aria-label={`${report.title}, approximate location`}><span>{index + 1}</span></a>)}
          <p>{discovery.privacy}</p>
        </div>}
        <div className="report-grid" aria-label="Accessible report list">{reports.map((report) => <div id={`report-${report.id}`} key={report.id}><ReportCard report={report} locale={locale} affectedLabel={copy.affected} /></div>)}</div>
        {reports.length === 0 && <p className="empty-state">{discovery.empty}</p>}
      </section>
    </main>
  );
}
