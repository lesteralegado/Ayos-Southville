"use client";
import Link from "next/link";
import { useLocale } from "@/features/i18n/use-locale";
export function ReportUnavailable({ reference }: { reference: string }) {
  const { locale } = useLocale(), fil = locale === "fil";
  return <main className="detail-page report-unavailable"><header className="composer-header"><Link className="brand" href="/">Ayos Southville</Link><Link href="/account">Account</Link></header>
    <section className="detail-card"><h1>{fil ? "Hindi ma-access ang ulat" : "Report unavailable"}</h1>
      <p>{reference}</p><p>{fil ? "Maaaring binawi o binura ang ulat, o pribado ito sa ibang account. Walang binagong rekord." : "The report may have been withdrawn or deleted, or it may be private to another account. No records have been changed."}</p>
      <div className="engagement-actions"><Link className="button button-primary" href="/account/notifications">{fil ? "Bumalik sa mga update" : "Back to updates"}</Link><Link className="button button-quiet" href="/account/reports">{fil ? "Aking mga ulat" : "My reports"}</Link></div>
      <p><Link href="/account">{fil ? "Suriin ang naka-sign in na account at mga kontrol sa privacy" : "Check your signed-in account and privacy controls"}</Link></p>
    </section></main>;
}
