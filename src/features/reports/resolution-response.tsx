"use client";

import { useState } from "react";

export function ResolutionResponse({ reference, fil }: { reference: string; fil: boolean }) {
  const [reason, setReason] = useState(""); const [message, setMessage] = useState(""); const [pending, setPending] = useState(false);
  async function respond(response: "confirm" | "dispute") {
    setPending(true); setMessage("");
    const update = response === "confirm"
      ? { en: "The resident confirmed the resolution.", fil: "Kinumpirma ng residente ang resolusyon." }
      : { en: "The resident reported that the problem remains.", fil: "Iniulat ng residente na nananatili ang problema." };
    try {
      const result = await fetch("/api/moderation", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "respond-to-resolution", input: { reference, response, reason, update } }) });
      const body = await result.json() as { error?: string };
      if (!result.ok) throw new Error(body.error ?? "Response could not be saved.");
      setMessage(fil ? "Naitala ang iyong tugon. I-refresh upang makita ang bagong status." : "Your response was recorded. Refresh to see the new status.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Response could not be saved."); }
    finally { setPending(false); }
  }
  return <section className="engagement-panel" aria-labelledby="resolution-response-title"><h2 id="resolution-response-title">{fil ? "Gumana ba ang resolusyon?" : "Did the resolution work?"}</h2><label>{fil ? "Dahilan" : "Reason"}<textarea value={reason} onChange={(event) => setReason(event.target.value)} required minLength={3} /></label><div className="engagement-actions"><button className="button button-dark" type="button" disabled={pending || reason.trim().length < 3} onClick={() => void respond("confirm")}>{fil ? "Kumpirmahin" : "Confirm resolution"}</button><button className="button button-quiet" type="button" disabled={pending || reason.trim().length < 3} onClick={() => void respond("dispute")}>{fil ? "Hindi pa nalutas" : "Problem remains"}</button></div><p role="status" aria-live="polite">{pending ? (fil ? "Sine-save…" : "Saving…") : message}</p></section>;
}