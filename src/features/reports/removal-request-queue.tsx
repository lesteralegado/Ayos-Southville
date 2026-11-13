"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useLocale } from "@/features/i18n/use-locale";
import { residentFlowCopy } from "./resident-flow-copy";

export function RemovalRequestQueue({ onArchived }: { onArchived?: () => void } = {}) {
  const { locale } = useLocale(), copy = residentFlowCopy[locale];
  const fil = locale === "fil";
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState("");
  const locked = useRef(false);
  const [requests, setRequests] = useState<Array<{ reference: string; createdAt: string }> | null>(null);
  const [error, setError] = useState(false), [pending, setPending] = useState(false), [nextCursor, setNextCursor] = useState<string | null>(null);
  async function reload(cursor?: string | null) {
    if (locked.current) return;
    locked.current = true;
    setPending(true); setError(false);
    try {
      const response = await fetch(`/api/report-requests${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error();
      const body = await response.json(); setRequests(current => cursor ? [...(current ?? []), ...body.requests] : body.requests); setNextCursor(body.nextCursor);
    } catch { setError(true); } finally { locked.current = false; setPending(false); }
  }
  async function archive(reference: string) {
    if (locked.current || !reasons[reference]?.trim()) return;
    locked.current = true; setPending(true); setError(false); setNotice("");
    try {
      const response = await fetch("/api/report-requests", { method: "PATCH", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(20000), body: JSON.stringify({ reference, reason: reasons[reference].trim(), confirmed: true }) });
      if (!response.ok) throw new Error();
      setRequests(current => current?.filter(request => request.reference !== reference) ?? []);
      setNotice(fil ? "Nai-archive ang ulat. Napanatili ang pribadong rekord at kasaysayan." : "Report archived. Its private record and history are preserved.");
      onArchived?.();
    } catch { setError(true); }
    finally { locked.current = false; setPending(false); }
  }
  return <details className="removal-request-queue" onToggle={event => { if (event.currentTarget.open && requests === null && !pending && !error) void reload(); }}>
    <summary>{copy.review}</summary>
    <button type="button" className="button button-quiet" disabled={pending} onClick={() => void reload()}>{copy.reload}</button>
    <p>{fil ? "Itatago ang mga na-archive na ulat sa publiko. Mananatili ang pribadong rekord at kasaysayan." : "Archiving hides a report from public view. Its private record and history remain."}</p>
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert">{fil ? "Hindi makumpirma ang aksyon. Napanatili ang dahilan. I-reload ang mga hiling o subukang muli." : "The action could not be confirmed. Your reason is kept. Reload requests or retry."}</p>}
    {requests?.length === 0 && !error && <p>{copy.empty}</p>}
    <ul>{requests?.map(request => <li key={request.reference}><Link href={`/reports/${request.reference}`}>{request.reference}</Link><time dateTime={request.createdAt}>{new Date(request.createdAt).toLocaleDateString(locale === "fil" ? "fil-PH" : "en-PH", { timeZone: "Asia/Manila" })}</time>
      <form onSubmit={event => { event.preventDefault(); void archive(request.reference); }}>
        <label htmlFor={`archive-${request.reference}`}>{fil ? "Dahilan ng pag-archive" : "Reason for archiving"}</label>
        <textarea id={`archive-${request.reference}`} required maxLength={500} rows={2} disabled={pending} value={reasons[request.reference] ?? ""} onChange={event => setReasons(current => ({ ...current, [request.reference]: event.target.value }))} />
        <button className="button button-quiet" type="submit" disabled={pending || !reasons[request.reference]?.trim()}>{pending ? copy.saving : fil ? "I-archive ang ulat" : "Archive report"}</button>
      </form>
    </li>)}</ul>
    {nextCursor && <button type="button" className="button button-quiet" disabled={pending} onClick={() => void reload(nextCursor)}>{copy.more}</button>}
  </details>;
}
