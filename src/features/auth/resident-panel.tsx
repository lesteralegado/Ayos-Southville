"use client";

import Link from "next/link";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { useLocale } from "@/features/i18n/use-locale";

const copy = {
  en: {
    eyebrow: "Resident space",
    greeting: "Hello",
    body: "Your verified identity stays private. Only your public alias appears beside future community activity.",
    newReport: "Report a concern",
    myReports: "My reports",
    notifications: "Notifications",
  },
  fil: {
    eyebrow: "Lugar ng residente",
    greeting: "Kumusta",
    body: "Mananatiling pribado ang iyong verified identity. Pampublikong alias lamang ang lalabas sa mga gawain sa komunidad.",
    newReport: "Mag-ulat ng concern",
    myReports: "Aking mga ulat",
    notifications: "Mga notification",
  },
} as const;

export function ResidentPanel({ publicAlias }: { publicAlias: string }) {
  const { locale } = useLocale();
  const message = copy[locale];
  return <main className="message-page"><div className="message-card"><span className="eyebrow">{message.eyebrow}</span><h1>{message.greeting}, {publicAlias}.</h1><p>{message.body}</p><div className="account-actions"><Link className="button button-primary" href="/reports/new">{message.newReport}</Link><Link className="button button-quiet" href="/account/reports">{message.myReports}</Link><Link className="button button-quiet" href="/account/notifications">{message.notifications}</Link></div><SignOutButton /></div></main>;
}
