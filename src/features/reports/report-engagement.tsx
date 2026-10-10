"use client";

import { useEffect, useState } from "react";
import type { ResidentReportState } from "./engagement-module";
import { compressEvidencePhoto, validateEvidenceFiles } from "./media-evidence";

const initial: ResidentReportState = { affected: false, following: false, supportingEvidence: [] };

export function ReportEngagement({ reference }: { reference: string }) {
  const [state, setState] = useState(initial);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  useEffect(() => { void fetch(`/api/reports/${reference}/engagement`).then((response) => response.ok ? response.json() : initial).then(setState); }, [reference]);
  async function update(action: "affected" | "follow", active: boolean, evidence: File[] = []) {
    const before = state;
    setState((current) => ({ ...current, [action === "affected" ? "affected" : "following"]: active }));
    setPending(true); setMessage("");
    try {
      const checked = validateEvidenceFiles(evidence);
      if (checked.issues.length) throw new Error(checked.issues.join(" "));
      const prepared = await Promise.all(checked.files.map(compressEvidencePhoto));
      const response = await fetch(`/api/reports/${reference}/engagement`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, active, evidence: prepared.map((file) => ({ id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, visibility: "restricted" })) }) });
      if (!response.ok) throw new Error("Update failed");
      setState(await response.json() as ResidentReportState);
      if (prepared.length) setMessage("Supporting evidence attached privately for review.");
    } catch (error) {
      setState(before);
      setMessage(error instanceof Error && error.message !== "Update failed" ? error.message : "The update failed. Your previous setting was restored; try again.");
    } finally { setPending(false); }
  }
  return <section className="engagement-panel" aria-labelledby="engagement-title"><h2 id="engagement-title">Stay connected to this report</h2><p>Following sends updates. Affected too records direct impact; the two are kept separate.</p><div className="engagement-actions"><button type="button" className="button button-dark" aria-pressed={state.affected} disabled={pending} onClick={() => void update("affected", !state.affected)}>{state.affected ? "Withdraw affected signal" : "I'm affected too"}</button><button type="button" className="button button-quiet" aria-pressed={state.following} disabled={pending} onClick={() => void update("follow", !state.following)}>{state.following ? "Unfollow report" : "Follow report"}</button></div>{state.affected && <label className="evidence-add">Add protected evidence<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={pending} onChange={(event) => void update("affected", true, Array.from(event.target.files ?? []))} /></label>}<p role="status" aria-live="polite">{pending ? "Saving your choice⬦" : message}</p></section>;
}
