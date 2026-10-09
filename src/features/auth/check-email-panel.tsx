"use client";

import Link from "next/link";
import { useLocale } from "@/features/i18n/use-locale";

const copy = {
  en: {
    title: "Check your inbox",
    body: "Use the verification link we sent before signing in. Your private resident profile will not publish an alias until verification is complete.",
    action: "Return to sign in",
  },
  fil: {
    title: "Tingnan ang iyong inbox",
    body: "Gamitin ang verification link na ipinadala namin bago mag-sign in. Hindi ilalathala ng pribadong resident profile ang iyong alias hangga't hindi tapos ang verification.",
    action: "Bumalik sa sign in",
  },
} as const;

export function CheckEmailPanel() {
  const { locale } = useLocale();
  const message = copy[locale];
  return <main className="message-page"><div className="message-card"><span className="mark" aria-hidden="true">✓</span><h1>{message.title}</h1><p>{message.body}</p><Link className="button button-primary" href="/sign-in">{message.action}</Link></div></main>;
}
