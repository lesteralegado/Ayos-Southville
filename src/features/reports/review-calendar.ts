export type ReviewCalendar = { from: string; through: string; holidays: string[]; source: string; ownerConfirmed: boolean };
export function validReviewCalendar(value: unknown): value is ReviewCalendar {
  if (!value || typeof value !== "object") return false;
  const c = value as ReviewCalendar;
  const date = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  return date(c.from) && date(c.through) && c.from <= c.through && Date.parse(c.through) - Date.parse(c.from) <= 366 * 86400000 &&
    Array.isArray(c.holidays) && c.holidays.length <= 100 && c.holidays.every(d => date(d) && d >= c.from && d <= c.through) &&
    typeof c.source === "string" && !!c.source.trim() && c.source.length <= 1000 && typeof c.ownerConfirmed === "boolean";
}
// Owner-approved: exclude the Manila submission date; count two following
// weekdays excluding confirmed holidays, with a 19:00 Asia/Manila target.
export function reviewDeadline(submittedAt: string, calendar?: ReviewCalendar): string | null {
  const submitted = Date.parse(submittedAt);
  if (!Number.isFinite(submitted) || !validReviewCalendar(calendar) || !calendar.ownerConfirmed) return null;
  const localDate = new Date(submitted + 8 * 3600000).toISOString().slice(0, 10);
  if (localDate < calendar.from || localDate > calendar.through) return null;
  let day = Date.parse(localDate), count = 0;
  for (let step = 0; step < 370; step++) {
    day += 86400000;
    const date = new Date(day), key = date.toISOString().slice(0, 10);
    if (key > calendar.through) return null;
    if (![0, 6].includes(date.getUTCDay()) && !calendar.holidays.includes(key) && ++count === 2)
      return new Date(day + 11 * 3600000).toISOString();
  }
  return null;
}
