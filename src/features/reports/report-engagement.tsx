"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/features/i18n/use-locale";
import type { ResidentReportState } from "./engagement-module";
import { compressEvidencePhoto, validateEvidenceFiles } from "./media-evidence";

const initial: ResidentReportState = { affected: false, following: false, supportingEvidence: [] };
const engagementCopy = {
  en: {
    title: "Stay connected to this report", explanation: "Following sends updates. Affected too records direct impact; the two are kept separate.",
    withdraw: "Withdraw affected signal", affected: "I'm affected too", unfollow: "Unfollow report", follow: "Follow report",
    add: "Add protected evidence", saving: "Saving your choice…", saved: "Supporting evidence attached privately for review.",
    failure: "The update failed. Your previous setting was restored; check your connection and try again.",
    permission: "Sign in with an approved pilot account to update this report.",
    photos: "Check the photo format and size, then choose the photos again.",
    loadFailure: "Your choices could not be loaded. Check your connection and reload before updating.",
  },
  fil: {
    title: "Subaybayan ang ulat", explanation: "Nagpapadala ng abiso ang pagsubaybay. Itinatala ng Apektado rin ako ang direktang epekto; magkahiwalay ang dalawa.",
    withdraw: "Bawiin ang pahayag na apektado", affected: "Apektado rin ako", unfollow: "Ihinto ang pagsubaybay", follow: "Subaybayan ang ulat",
    add: "Magdagdag ng protektadong litrato", saving: "Sine-save ang inyong pinili…", saved: "Pribadong inilakip ang litrato para sa pagsusuri.",
    failure: "Hindi na-save ang pagbabago. Naibalik ang dating pinili; suriin ang koneksyon at subukang muli.",
    permission: "Mag-sign in gamit ang aprubadong pilot account para baguhin ang pinili sa ulat.",
    photos: "Suriin ang format at laki ng litrato, pagkatapos ay piliin muli ang mga litrato.",
    loadFailure: "Hindi makuha ang inyong mga pinili. Suriin ang koneksyon at i-reload bago magbago.",
  },
};
type Message = "" | "saved" | "failure" | "permission" | "photos" | "loadFailure";

export function ReportEngagement({ reference }: { reference: string }) {
  const { locale } = useLocale(), copy = engagementCopy[locale];
  const [state, setState] = useState(initial);
  const [message, setMessage] = useState<Message>("");
  const [pending, setPending] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/reports/${reference}/engagement`, { signal: controller.signal }).then(async response => {
      if (response.status === 401 || response.status === 403) return initial;
      if (!response.ok) throw new Error("UNAVAILABLE");
      return response.json();
    }).then(value => { if (!controller.signal.aborted) setState(value); })
      .catch(() => { if (!controller.signal.aborted) setMessage("loadFailure"); });
    return () => controller.abort();
  }, [reference]);
  async function update(action: "affected" | "follow", active: boolean, evidence: File[] = []) {
    const before = state;
    setState(current => ({ ...current, [action === "affected" ? "affected" : "following"]: active }));
    setPending(true); setMessage("");
    try {
      const checked = validateEvidenceFiles(evidence);
      if (checked.issues.length) throw new Error("PHOTOS");
      const prepared = await Promise.all(checked.files.map(compressEvidencePhoto));
      const response = await fetch(`/api/reports/${reference}/engagement`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, active, evidence: prepared.map(file => ({ id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, visibility: "restricted" })) }),
      });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "PERMISSION" : "FAILURE");
      setState(await response.json() as ResidentReportState);
      if (prepared.length) setMessage("saved");
    } catch (error) {
      setState(before);
      setMessage(error instanceof Error && error.message === "PERMISSION" ? "permission" : error instanceof Error && error.message === "PHOTOS" ? "photos" : "failure");
    } finally { setPending(false); }
  }
  return <section className="engagement-panel" aria-labelledby="engagement-title">
    <h2 id="engagement-title">{copy.title}</h2><p>{copy.explanation}</p>
    <div className="engagement-actions">
      <button type="button" className="button button-dark" aria-pressed={state.affected} disabled={pending} onClick={() => void update("affected", !state.affected)}>{state.affected ? copy.withdraw : copy.affected}</button>
      <button type="button" className="button button-quiet" aria-pressed={state.following} disabled={pending} onClick={() => void update("follow", !state.following)}>{state.following ? copy.unfollow : copy.follow}</button>
    </div>
    {state.affected && <label className="evidence-add">{copy.add}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={pending} onChange={event => void update("affected", true, Array.from(event.target.files ?? []))} /></label>}
    <p role="status" aria-live="polite">{pending ? copy.saving : message ? copy[message] : ""}</p>
  </section>;
}
