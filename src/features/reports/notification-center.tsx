"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { NotificationPreferences, ResidentNotification } from "./engagement-module";

const defaultPreferences: NotificationPreferences = { emailEnabled: false, statusUpdates: true, followUpdates: true };

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<ResidentNotification[]>([]);
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [message, setMessage] = useState("Loading notifications⬦");
  useEffect(() => { void fetch("/api/notifications").then((response) => response.json()).then((result) => { setNotifications(result.notifications ?? []); setPreferences(result.preferences ?? defaultPreferences); setMessage(""); }).catch(() => setMessage("Notifications could not be loaded. Try refreshing.")); }, []);
  async function markRead(notification: ResidentNotification) {
    setNotifications((items) => items.map((item) => item.id === notification.id ? { ...item, read: true } : item));
    const response = await fetch("/api/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ notificationId: notification.id }) });
    if (!response.ok) { setNotifications((items) => items.map((item) => item.id === notification.id ? notification : item)); setMessage("The notification stayed unread because the update failed."); }
  }
  async function savePreferences(next: NotificationPreferences) {
    const before = preferences; setPreferences(next); setMessage("Saving preferences⬦");
    const response = await fetch("/api/notifications", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ preferences: next }) });
    if (!response.ok) { setPreferences(before); setMessage("Preferences were restored because saving failed."); } else setMessage("Preferences saved.");
  }
  return <main className="notifications-page"><header className="composer-header"><Link className="brand" href="/">Ayos Southville</Link><Link className="text-link" href="/account">Account</Link></header><div className="notifications-layout"><section><h1>Notifications</h1><p>Private updates for reports you submitted, followed, or marked as affecting you.</p><p role="status" aria-live="polite">{message}</p><ul className="notification-list">{notifications.map((notice) => <li key={notice.id} className={notice.read ? "is-read" : ""}><div><strong>{notice.message}</strong><Link href={`/reports/${notice.reference}`}>{notice.reference}</Link></div>{!notice.read && <button type="button" className="button button-quiet" onClick={() => void markRead(notice)}>Mark read</button>}</li>)}</ul>{!message && notifications.length === 0 && <p className="empty-state">No notifications yet.</p>}</section><aside className="preferences-panel"><h2>Notification preferences</h2><label><input type="checkbox" checked={preferences.emailEnabled} onChange={(event) => void savePreferences({ ...preferences, emailEnabled: event.target.checked })} /> Email important updates</label><label><input type="checkbox" checked={preferences.statusUpdates} onChange={(event) => void savePreferences({ ...preferences, statusUpdates: event.target.checked })} /> Submitted and affected report updates</label><label><input type="checkbox" checked={preferences.followUpdates} onChange={(event) => void savePreferences({ ...preferences, followUpdates: event.target.checked })} /> Followed report updates</label></aside></div></main>;
}
