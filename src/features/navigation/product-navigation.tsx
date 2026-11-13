"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/features/i18n/use-locale";
import { navigationCopy, canOperateReports } from "./navigation-copy";
import { useEffect, useState } from "react";

export function ProductNavigation({ roles = [], signedIn = false }: { roles?: readonly string[]; signedIn?: boolean }) {
  const pathname = usePathname();
  const { locale, chooseLocale } = useLocale();
  const fil = locale === "fil";
  const copy = navigationCopy[locale];
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    if (!signedIn) return;
    const controller = new AbortController();
    const refresh = () => { void fetch("/api/notifications?summary=1", { cache: "no-store", signal: controller.signal }).then(response => response.ok ? response.json() : null).then(value => { if (!controller.signal.aborted && Number.isSafeInteger(value?.unreadCount)) setUnread(value.unreadCount); }).catch(() => {}); };
    refresh(); window.addEventListener("ayos-updates-changed", refresh);
    return () => { controller.abort(); window.removeEventListener("ayos-updates-changed", refresh); };
  }, [signedIn]);
  const links = [
    { href: "/", label: copy.community, active: pathname === "/" || (pathname?.startsWith("/reports/") && pathname !== "/reports/new") },
    ...(signedIn ? [{ href: "/reports/new", label: copy.report, active: pathname === "/reports/new" },
    { href: "/account/reports", label: copy.mine, active: pathname?.startsWith("/account/reports") || pathname === "/account/notifications" }] : []),
    ...(signedIn && canOperateReports(roles)
      ? [{ href: "/moderation", label: copy.operations, active: pathname === "/moderation" }] : []),
    ...(signedIn ? [{ href: "/account", label: copy.account, active: pathname === "/account" || pathname?.startsWith("/administration") || pathname === "/account/privacy" }] : []),
  ];
  return <header className="product-header">
    <Link className="brand" href="/"><span className="mark" aria-hidden="true"><svg viewBox="0 0 36 36"><path d="M7 19.5 14.5 27 29 10.5" /></svg></span>Ayos Southville</Link>
    <nav aria-label={copy.primary}>
      {links.map(link => <Link key={link.href} href={link.href} className={link.href === "/reports/new" ? "navigation-primary" : undefined} aria-current={link.active ? "page" : undefined}>{link.label}{link.href === "/account/reports" && unread > 0 && <span className="unread-indicator" aria-label={copy.unread}>{unread}</span>}</Link>)}
    </nav>
    <div className="product-utilities">
      {!signedIn && <Link href="/sign-in">{copy.signIn}</Link>}
      <button type="button" className="language-button" onClick={() => chooseLocale(fil ? "en" : "fil")}>{fil ? "English" : "Filipino"}</button>
    </div>
  </header>;
}
