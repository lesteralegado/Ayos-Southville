"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "@/features/i18n/use-locale";
import { formatManilaDate } from "./report-presentation";
import type { NotificationPreferences, ResidentNotification } from "./engagement-module";
const defaults: NotificationPreferences = { emailEnabled: false, statusUpdates: true, followUpdates: true };

export function NotificationCenter() {
  const { locale, chooseLocale } = useLocale(); const fil = locale === "fil";
  const t = (en: string, translated: string) => fil ? translated : en;
  const [notifications, setNotifications] = useState<ResidentNotification[]>([]);
  const [preferences, setPreferences] = useState(defaults);
  const [loaded, setLoaded] = useState(false); const [busy, setBusy] = useState(true);
  const [error, setError] = useState<"auth" | "load" | "save" | "" >("");
  const [saved, setSaved] = useState<"read" | "preferences" | "">("");
  const locked = useRef(false);
  const reload = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/notifications", { cache: "no-store", signal: signal ?? AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(response.status === 401 ? "auth" : "load");
    const body = await response.json() as { notifications: ResidentNotification[]; preferences: NotificationPreferences };
    if (!Array.isArray(body.notifications) || !body.preferences) throw new Error("load");
    setNotifications(body.notifications); setPreferences(body.preferences); setLoaded(true);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void Promise.resolve().then(() => reload(AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]))).catch(error => { if (!controller.signal.aborted) setError(error.message === "auth" ? "auth" : "load"); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [reload]);
  async function refresh() {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(""); setSaved("");
    try { await reload(); } catch (error) { setError(error instanceof Error && error.message === "auth" ? "auth" : "load"); }
    finally { locked.current = false; setBusy(false); }
  }
  async function update(input: { notificationId: string } | { preferences: NotificationPreferences }) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(""); setSaved("");
    try {
      const response = await fetch("/api/notifications", { method: "PATCH", signal: AbortSignal.timeout(20_000), headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      if (!response.ok) throw new Error(response.status === 401 ? "auth" : "save");
      await reload(); setSaved("notificationId" in input ? "read" : "preferences");
    } catch (error) { setError(error instanceof Error && error.message === "auth" ? "auth" : "save"); }
    finally { locked.current = false; setBusy(false); }
  }
  return <main className="notifications-page"><header className="composer-header">
    <Link className="brand" href="/">Ayos Southville</Link>
    <div className="communication-nav"><label>{t("Language", "Wika")}<select value={locale} onChange={event => chooseLocale(event.target.value as "en" | "fil")}><option value="en">English</option><option value="fil">Filipino</option></select></label><Link className="text-link" href="/account">{t("Account", "Account")}</Link></div>
  </header><div className="notifications-layout"><section aria-labelledby="notifications-title">
    <h1 id="notifications-title">{t("Notifications", "Mga abiso")}</h1>
    <p>{t("Private updates for reports you submitted, followed, or marked as affecting you.", "Mga pribadong update para sa mga ulat na isinumite, sinundan, o minarkahang nakaaapekto sa iyo.")}</p>
    <button className="button button-quiet" type="button" disabled={busy} onClick={() => void refresh()}>{t("Reload notifications", "I-reload ang mga abiso")}</button>
    <p role="status" aria-live="polite">{busy ? t("Loading or saving notifications…", "Nilo-load o sine-save ang mga abiso…") : saved === "read" ? t("Notification marked read.", "Namarkahang nabasa ang abiso.") : saved === "preferences" ? t("Preferences saved.", "Na-save ang mga kagustuhan.") : ""}</p>
    {error && <div className="form-alert" role="alert"><p>{error === "auth" ? t("Sign in again to view or update your private notifications.", "Mag-sign in muli upang makita o baguhin ang iyong pribadong abiso.") : error === "load" ? t("Notifications could not be loaded. Reload to try again.", "Hindi ma-load ang mga abiso. I-reload upang subukan muli.") : t("The update could not be confirmed. Your previous settings remain shown. Reload before retrying.", "Hindi makumpirma ang update. Ipinapakita pa rin ang dating mga setting. I-reload bago subukan muli.")}</p>{error === "auth" && <Link href="/sign-in?next=/account/notifications">{t("Sign in", "Mag-sign in")}</Link>}</div>}
    <ul className="notification-list" aria-busy={busy}>{notifications.map(notice => <li key={notice.id} className={notice.read ? "is-read" : ""}><div>
      <span className="notification-read-state">{notice.read ? t("Read", "Nabasa") : t("Unread", "Hindi pa nababasa")}</span>
      <strong>{notice.update ? notice.update[locale] : notice.kind === "follow" ? t("You are now following this report.", "Sinusundan mo na ang ulat na ito.") : notice.kind === "affected" ? t("You marked this report as affecting you.", "Minarkahan mong nakaaapekto sa iyo ang ulat na ito.") : notice.message}</strong>
      <Link href={`/reports/${notice.reference}`}>{t("View report", "Tingnan ang ulat")} {notice.reference}</Link>
      <time dateTime={notice.createdAt}>{formatManilaDate(notice.createdAt, locale, true)}</time>
    </div>{!notice.read && <button type="button" className="button button-quiet" disabled={busy} onClick={() => void update({ notificationId: notice.id })}>{t("Mark read", "Markahang nabasa")}</button>}</li>)}</ul>
    {loaded && !error && notifications.length === 0 && <p className="empty-state">{t("No notifications yet. Updates will appear here when your reports progress.", "Wala pang abiso. Dito lilitaw ang mga update kapag may progreso ang iyong mga ulat.")}</p>}
  </section><aside className="preferences-panel" aria-labelledby="preferences-title"><h2 id="preferences-title">{t("Notification preferences", "Mga kagustuhan sa abiso")}</h2>
    <p>{t("Email is optional and off until you opt in. Emails contain a reference and a sign-in link, not private report details.", "Opsyonal ang email at naka-off hanggang piliin mo ito. Reference at link sa pag-sign in lamang ang nasa email, hindi pribadong detalye ng ulat.")}</p>
    {([ ["emailEnabled", "Email important updates", "I-email ang mahahalagang update"], ["statusUpdates", "Submitted and affected report updates", "Mga update sa isinumite at nakaaapektong ulat"], ["followUpdates", "Followed report updates", "Mga update sa sinusundang ulat"] ] as const).map(([key, en, translated]) => <label key={key}><input type="checkbox" disabled={busy || !loaded || !!error} checked={preferences[key]} onChange={event => void update({ preferences: { ...preferences, [key]: event.target.checked } })} />{t(en, translated)}</label>)}
    <p>{t("Turning off a category stops new notifications and its lifecycle emails. Existing notifications remain available.", "Kapag in-off ang kategorya, hihinto ang mga bagong abiso at lifecycle email nito. Mananatili ang mga dating abiso.")}</p>
  </aside></div></main>;
}
