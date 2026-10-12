import type { ResidentReport } from "./report-module";
import { reviewCopy } from "./review-copy";
export function ResidentReviewExpectation({ report, locale }: { report: ResidentReport; locale: "en" | "fil" }) {
  const copy = reviewCopy[locale], expectation = report.reviewExpectation;
  const time = expectation?.acknowledgedAt ?? expectation?.dueAt;
  return <p>{time ? <><strong>{expectation?.acknowledgedAt ? copy.acknowledged : copy.due}</strong>: <time dateTime={time}>{new Date(time).toLocaleString(locale === "fil" ? "fil-PH" : "en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })} · Asia/Manila</time></> : copy.unknown}</p>;
}
