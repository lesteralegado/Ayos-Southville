"use client";
import Link from "next/link";
import { useState } from "react";
import { useLocale } from "@/features/i18n/use-locale";
import { residentFlowCopy } from "./resident-flow-copy";

export function RemovalRequestQueue() {
  const { locale } = useLocale(), copy = residentFlowCopy[locale];
  const [requests, setRequests] = useState<Array<{ reference: string; createdAt: string }> | null>(null);
  const [error, setError] = useState(false), [pending, setPending] = useState(false), [nextCursor, setNextCursor] = useState<string | null>(null);
  async function reload(cursor?: string | null) {
    setPending(true); setError(false);
    try {
      const response = await fetch(`/api/report-requests${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error();
      const body = await response.json(); setRequests(current => cursor ? [...(current ?? []), ...body.requests] : body.requests); setNextCursor(body.nextCursor);
    } catch { setError(true); } finally { setPending(false); }
  }
  return <details className="removal-request-queue" onToggle={event => { if (event.currentTarget.open && requests === null && !pending && !error) void reload(); }}>
    <summary>{copy.review}</summary>
    <button type="button" className="button button-quiet" disabled={pending} onClick={() => void reload()}>{copy.reload}</button>
    {error && <p role="alert">{copy.reviewError}</p>}
    {requests?.length === 0 && !error && <p>{copy.empty}</p>}
    <ul>{requests?.map(request => <li key={request.reference}><Link href={`/reports/${request.reference}`}>{request.reference}</Link><time dateTime={request.createdAt}>{new Date(request.createdAt).toLocaleDateString(locale === "fil" ? "fil-PH" : "en-PH", { timeZone: "Asia/Manila" })}</time></li>)}</ul>
    {nextCursor && <button type="button" className="button button-quiet" disabled={pending} onClick={() => void reload(nextCursor)}>{copy.more}</button>}
  </details>;
}
