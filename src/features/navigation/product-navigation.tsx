"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/features/i18n/use-locale";
import { navigationCopy, canOperateReports } from "./navigation-copy";

export function ProductNavigation({ roles = [], signedIn = false }: { roles?: readonly string[]; signedIn?: boolean }) {
  const pathname = usePathname();
  const { locale, chooseLocale } = useLocale();
  const fil = locale === "fil";
  const copy = navigationCopy[locale];
  const links = [
    { href: "/", label: copy.community, active: pathname === "/" || (pathname?.startsWith("/reports/") && pathname !== "/reports/new") },
    { href: "/reports/new", label: copy.report, active: pathname === "/reports/new" },
    { href: "/account/reports", label: copy.mine, active: pathname?.startsWith("/account/reports") || pathname === "/account/notifications" },
    ...(canOperateReports(roles)
      ? [{ href: "/moderation", label: copy.operations, active: pathname === "/moderation" }] : []),
    { href: "/account", label: copy.account, active: pathname === "/account" || pathname?.startsWith("/administration") || pathname === "/account/privacy" },
  ];
  return <header className="product-header">
    <Link className="brand" href="/"><span className="mark" aria-hidden="true"><svg viewBox="0 0 36 36"><path d="M7 19.5 14.5 27 29 10.5" /></svg></span>Ayos Southville</Link>
    <nav aria-label={copy.primary}>
      {links.map(link => <Link key={link.href} href={link.href} className={link.href === "/reports/new" ? "navigation-primary" : undefined} aria-current={link.active ? "page" : undefined}>{link.label}</Link>)}
    </nav>
    <div className="product-utilities">
      {!signedIn && <Link href="/sign-in">{copy.signIn}</Link>}
      <button type="button" className="language-button" onClick={() => chooseLocale(fil ? "en" : "fil")}>{fil ? "English" : "Filipino"}</button>
    </div>
  </header>;
}
