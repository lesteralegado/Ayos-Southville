"use client";

import Link from "next/link";
import { messages } from "@/features/i18n/messages";
import { useLocale } from "@/features/i18n/use-locale";
import { LiveDiscovery } from "@/features/reports/live-discovery";

function Mark() {
  return <span className="mark" aria-hidden="true"><svg viewBox="0 0 36 36"><path d="M7 19.5 14.5 27 29 10.5" /></svg></span>;
}

export default function HomePage() {
  const { locale, chooseLocale } = useLocale();
  const copy = messages[locale];
  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Ayos Southville home"><Mark /><span>Ayos Southville</span></Link>
        <nav aria-label={locale === "fil" ? "Pangunahing nabigasyon" : "Primary navigation"}>
          <a href="#reports">{copy.reportsLink}</a>
          <Link href="/insights">{locale === "fil" ? "Mga resulta" : "Insights"}</Link>
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
            <Link className="button button-primary" href="/register">{copy.reportAction}</Link>
            <a className="text-link" href="#reports">{copy.browseAction}</a>
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
          <h2 id="reports-title">{copy.reportsTitle}</h2>
          <p>{copy.privacy}</p>
        </div>
        <LiveDiscovery />
      </section>
    </main>
  );
}
