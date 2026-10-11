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

export function ResidentPanel({
  publicAlias,
  roles = [],
  approved = true,
}: {
  publicAlias: string;
  roles?: string[];
  approved?: boolean;
}) {
  const { locale } = useLocale();
  const message = copy[locale];
  return (
    <main className="message-page">
      <div className="message-card">
        <h1>
          {message.greeting}, {publicAlias}.
        </h1>
        <p>{message.body}</p>
        {!approved && (
          <p>
            {locale === "fil"
              ? "Kailangan ang imbitasyon o approval bago mag-ulat. Maaari ka pa ring tumingin ng pampublikong ulat."
              : "Invitation or approval is required before reporting. You can still browse public reports."}
          </p>
        )}
        <div className="account-actions">
          <Link
            className="button button-primary"
            href={approved ? "/reports/new" : "/"}
          >
            {approved
              ? message.newReport
              : locale === "fil"
                ? "Tingnan ang mga ulat"
                : "Browse reports"}
          </Link>
          <Link className="button button-quiet" href="/account/reports">
            {message.myReports}
          </Link>
          <Link className="button button-quiet" href="/account/notifications">
            {message.notifications}
          </Link>
          <Link className="button button-quiet" href="/account/privacy">{locale === "fil" ? "Privacy at aking datos" : "Privacy and my data"}</Link>
          {roles.some((role) =>
            ["Moderator", "Coordinator", "Administrator"].includes(role),
          ) && (
            <Link className="button button-quiet" href="/moderation">
              {locale === "fil"
                ? "Mga ulat para sa pagsusuri"
                : "Operator workspace"}
            </Link>
          )}
          {roles.includes("Administrator") && (
            <Link className="button button-quiet" href="/administration/operations">{locale === "fil" ? "Mga operasyon ng privacy" : "Privacy operations"}</Link>
          )}
          {roles.includes("Administrator") && (
            <Link className="button button-quiet" href="/administration">
              {locale === "fil" ? "Pamamahala" : "Administration"}
            </Link>
          )}
        </div>
        <SignOutButton />
      </div>
    </main>
  );
}
