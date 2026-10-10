"use client";
import Link from "next/link";
import { useLocale } from "@/features/i18n/use-locale";
export function PilotAccessPanel() {
  const { locale, chooseLocale } = useLocale();
  return (
    <main className="message-page">
      <section className="message-card">
        <h1>
          {locale === "fil"
            ? "Kailangan ang approval sa pilot"
            : "Pilot approval needed"}
        </h1>
        <p>
          {locale === "fil"
            ? "Verified na ang iyong account. Hilingin sa pilot administrator ang imbitasyon gamit ang iyong verified email. Maaari ka pa ring tumingin ng mga pampublikong ulat."
            : "Your account is verified. Ask the pilot administrator to invite your verified email. You can still browse public reports."}
        </p>
        <div className="account-actions">
          <Link className="button button-primary" href="/">
            {locale === "fil" ? "Tingnan ang mga ulat" : "Browse reports"}
          </Link>
          <Link className="button button-quiet" href="/account">
            {locale === "fil" ? "Aking account" : "My account"}
          </Link>
          <button
            className="language-button"
            onClick={() => chooseLocale(locale === "en" ? "fil" : "en")}
          >
            {locale === "en" ? "Filipino" : "English"}
          </button>
        </div>
      </section>
    </main>
  );
}
