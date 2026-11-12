import type { ResidentNotification } from "./engagement-module";
export type NotificationPosition = { createdAt: string; id: string };
export function notificationPosition(uid: string, cursor?: string | null): NotificationPosition | null {
  if (!cursor) return null;
  try {
    if (cursor.length > 1000) throw new Error();
    const value = JSON.parse(atob(cursor));
    if (value.uid !== uid || typeof value.createdAt !== "string" || !Number.isFinite(Date.parse(value.createdAt)) || typeof value.id !== "string" || !/^[a-zA-Z0-9-]{1,100}$/.test(value.id)) throw new Error();
    return { createdAt: value.createdAt, id: value.id };
  } catch { throw new Error("Invalid notification cursor"); }
}
export function notificationPage(uid: string, rows: ResidentNotification[]) {
  const notifications = rows.slice(0, 20), last = notifications.at(-1);
  return { notifications, nextCursor: rows.length > 20 && last ? btoa(JSON.stringify({ uid, createdAt: last.createdAt, id: last.id })) : null };
}
