"use client";

import { SignOutButton } from "@/features/auth/sign-out-button";
import { useLocale } from "@/features/i18n/use-locale";

const copy = {
  en: {
    eyebrow: "Resident space",
    greeting: "Hello",
    body: "Your verified identity stays private. Only your public alias appears beside future community activity.",
  },
  fil: {
    eyebrow: "Lugar ng residente",
    greeting: "Kumusta",
    body: "Mananatiling pribado ang iyong verified identity. Pampublikong alias lamang ang lalabas sa mga gawain sa komunidad.",
  },
} as const;

export function ResidentPanel({ publicAlias }: { publicAlias: string }) {
  const { locale } = useLocale();
  const message = copy[locale];
  return <main className="message-page"><div className="message-card"><span className="eyebrow">{message.eyebrow}</span><h1>{message.greeting}, {publicAlias}.</h1><p>{message.body}</p><SignOutButton /></div></main>;
}
