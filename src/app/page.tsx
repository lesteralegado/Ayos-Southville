"use client";

import Link from "next/link";
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
  const reports = listPublicReports();

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
        <div className="report-grid">{reports.map((report) => <ReportCard key={report.id} report={report} locale={locale} affectedLabel={copy.affected} />)}</div>
      </section>
    </main>
  );
}
