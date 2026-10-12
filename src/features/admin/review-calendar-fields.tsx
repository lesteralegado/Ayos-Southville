import type { ReviewCalendar } from "@/features/reports/review-calendar";
import { useState } from "react";
import { reviewCopy } from "@/features/reports/review-copy";
export function ReviewCalendarFields({ value, change, locale }: { value?: ReviewCalendar; change(value: ReviewCalendar): void; locale: "en" | "fil" }) {
  const copy = reviewCopy[locale], calendar = value ?? { from: "", through: "", holidays: [], source: "", ownerConfirmed: false };
  const [holidayText, setHolidayText] = useState(calendar.holidays.join("\n"));
  const edit = (fields: Partial<ReviewCalendar>) => change({ ...calendar, ...fields, ownerConfirmed: false });
  return <section className="review-section" aria-labelledby="review-calendar-title">
    <h3 id="review-calendar-title">{copy.calendar}</h3><p>{copy.calendarHelp}</p>
    <div className="admin-emergency-grid"><label>{copy.from}<input type="date" value={calendar.from} onChange={e => edit({ from: e.target.value })} /></label><label>{copy.through}<input type="date" value={calendar.through} onChange={e => edit({ through: e.target.value })} /></label></div>
    <label>{copy.holidays}<textarea rows={5} value={holidayText} onChange={e => { setHolidayText(e.target.value); edit({ holidays: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) }); }} /></label>
    <label>{copy.source}<textarea maxLength={1000} value={calendar.source} onChange={e => edit({ source: e.target.value })} /></label>
    <label className="admin-check"><input type="checkbox" checked={calendar.ownerConfirmed} onChange={e => change({ ...calendar, ownerConfirmed: e.target.checked })} />{copy.confirm}</label>
  </section>;
}
