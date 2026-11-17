"use client";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/features/i18n/use-locale";
import type { ResidentReport } from "./report-module";
import { canClarifyReport, pendingClarification } from "./report-clarification";
import { clarificationCopy } from "./clarification-copy";
import { LocationPicker } from "./location-picker";

export function ResidentClarification({ report }: { report: ResidentReport }) {
  const { locale } = useLocale(), copy = clarificationCopy[locale], router = useRouter();
  const request = pendingClarification(report);
  const [explanation, setExplanation] = useState(""), [description, setDescription] = useState(""), [landmark, setLandmark] = useState("");
  const [pin, setPin] = useState(false), [latitude, setLatitude] = useState(""), [longitude, setLongitude] = useState("");
  const [pending, setPending] = useState(false), [done, setDone] = useState(false), [error, setError] = useState<"failure" | "conflict" | "forbidden" | "">("");
  const operation = useRef<string | null>(null), locked = useRef(false), retryInput = useRef<Record<string, unknown> | null>(null);
  const result = useRef<HTMLParagraphElement>(null);
  if (!request || !canClarifyReport(report)) return null;
  async function send(event?: FormEvent) {
    event?.preventDefault();
    if (locked.current || !request) return;
    operation.current ??= crypto.randomUUID();
    retryInput.current ??= { reference: report.reference, expectedRevision: report.revision ?? 0, operationId: operation.current, requestId: request.id, explanation,
      ...(description.trim() ? { description } : {}), ...(landmark.trim() ? { nearbyLandmark: landmark } : {}),
      ...(pin ? { location: { latitude: Number(latitude), longitude: Number(longitude) } } : {}),
    };
    locked.current = true; setPending(true); setError("");
    try {
      const response = await fetch("/api/moderation", { method: "PATCH", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(20000), body: JSON.stringify({ action: "respond-to-clarification", input: retryInput.current }) });
      if (!response.ok) { setError(response.status === 409 ? "conflict" : [401,403].includes(response.status) ? "forbidden" : "failure"); return; }
      setDone(true); router.refresh(); requestAnimationFrame(() => result.current?.focus());
    } catch { setError("failure"); }
    finally { locked.current = false; setPending(false); }
  }
  return <section className="engagement-panel clarification-panel" aria-labelledby="clarification-title">
    <h2 id="clarification-title">{copy.waiting}</h2><p>{copy.private}</p><blockquote>{request.question}</blockquote>
    {request.response || done ? <p ref={result} tabIndex={-1} role="status">{copy.answered}</p> : <form onSubmit={event => void send(event)}>
      <fieldset disabled={pending || !!error}>
        <label htmlFor="clarification-explanation">{copy.explanation}</label><textarea id="clarification-explanation" required maxLength={1000} value={explanation} onChange={event => setExplanation(event.target.value)} />
        <details className="advanced-disclosure"><summary>{copy.corrections}</summary>
          <label htmlFor="clarification-description">{copy.description}</label><textarea id="clarification-description" maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} />
          <label htmlFor="clarification-landmark">{copy.landmark}</label><input id="clarification-landmark" maxLength={160} value={landmark} onChange={event => setLandmark(event.target.value)} />
          <label><input type="checkbox" checked={pin} onChange={event => setPin(event.target.checked)} />{copy.pin}</label>
          {pin && <><LocationPicker latitude={latitude} longitude={longitude} locale={locale} onSelect={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} />
            <label>{copy.latitude}<input type="number" required min={-90} max={90} step="any" value={latitude} onChange={event => setLatitude(event.target.value)} /></label>
            <label>{copy.longitude}<input type="number" required min={-180} max={180} step="any" value={longitude} onChange={event => setLongitude(event.target.value)} /></label></>}
        </details>
        <button className="button button-primary" disabled={!explanation.trim()}>{pending ? copy.saving : copy.respond}</button>
      </fieldset>
    </form>}
    {error && <div role="alert"><p>{copy[error]}</p>{error === "failure" && <button className="button button-quiet" onClick={() => void send()}>{copy.retry}</button>}<button className="button button-quiet" onClick={() => { setError(""); retryInput.current = null; operation.current = null; router.refresh(); }}>{copy.reload}</button></div>}
  </section>;
}
