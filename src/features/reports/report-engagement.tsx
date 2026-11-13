"use client";

import { useEffect, useState } from "react";
import { useLocale } from "@/features/i18n/use-locale";
import type { ResidentReportState } from "./engagement-module";
import { EvidencePicker } from "./evidence-picker";
import { clearLocalPhotos } from "./evidence-drafts";
import type { EvidenceAsset } from "./report-module";

const initial: ResidentReportState = { affected: false, following: false, supportingEvidence: [] };
const engagementCopy = {
  en: {
    title: "Stay connected to this report", explanation: "Get notified when this report changes. Sign in with an approved pilot account.",
    unfollow: "Stop updates", follow: "Get updates",
    add: "Add protected evidence", saving: "Saving your choice…", saved: "Supporting evidence attached privately for review.",
    failure: "The update failed. Your previous setting was restored; check your connection and try again.",
    permission: "Sign in with an approved pilot account to update this report.",
    photos: "Check the photo format and size, then choose the photos again.",
    loadFailure: "Your choices could not be loaded. Check your connection and reload before updating.",
  },
  fil: {
    title: "Subaybayan ang ulat", explanation: "Tumanggap ng abiso kapag nagbago ang ulat. Mag-sign in gamit ang aprubadong pilot account.",
    unfollow: "Ihinto ang mga update", follow: "Tumanggap ng mga update",
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
  const [loading, setLoading] = useState(true), [attempt, setAttempt] = useState(0);
  const [uploadOwner, setUploadOwner] = useState("");
  const [assets, setAssets] = useState<EvidenceAsset[]>([]), [blocked, setBlocked] = useState(true), [pickerVersion, setPickerVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/reports/${reference}/engagement`, { signal: controller.signal }).then(async response => {
      if (response.status === 401 || response.status === 403) { setMessage("permission"); return initial; }
      if (!response.ok) throw new Error("UNAVAILABLE");
      return response.json();
    }).then(value => { if (!controller.signal.aborted) { setState(value); setUploadOwner(typeof value.uploadOwner === "string" ? value.uploadOwner : ""); } })
      .catch(() => { if (!controller.signal.aborted) setMessage("loadFailure"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reference, attempt]);
  async function update(action: "affected" | "updates", active: boolean, evidence: EvidenceAsset[] = []) {
    const before = state;
    setState(current => action === "updates" ? { ...current, following: active, affected: active && current.affected } : { ...current, affected: active });
    setPending(true); setMessage("");
    try {
      const response = await fetch(`/api/reports/${reference}/engagement`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, active, evidence }),
      });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "PERMISSION" : "FAILURE");
      setState(await response.json() as ResidentReportState);
      if (evidence.length) { setMessage("saved"); await clearLocalPhotos(uploadOwner, `support_${reference}`).catch(() => undefined); setAssets([]); setPickerVersion(value => value + 1); }
    } catch (error) {
      setState(before);
      setMessage(error instanceof Error && error.message === "PERMISSION" ? "permission" : error instanceof Error && error.message === "PHOTOS" ? "photos" : "failure");
    } finally { setPending(false); }
  }
  return <section className="engagement-panel" aria-labelledby="engagement-title">
    <h2 id="engagement-title">{copy.title}</h2><p>{copy.explanation}</p>
    <div className="engagement-actions">
      <button type="button" className="button button-dark" aria-pressed={state.following || state.affected} disabled={pending || loading || !!message && message !== "saved"} onClick={() => void update("updates", !(state.following || state.affected))}>{state.following || state.affected ? copy.unfollow : copy.follow}</button>
    </div>
    {uploadOwner && <details className="supporting-evidence advanced-disclosure"><summary>{copy.add}</summary><EvidencePicker key={pickerVersion} owner={uploadOwner} draftKey={`support_${reference}`} locale={locale} onAssets={setAssets} onBlocked={setBlocked} />
      <button className="button button-dark" disabled={pending || loading || !!message && message !== "saved" || blocked || !assets.length} onClick={() => void update("affected", true, assets)}>{locale === "fil" ? "Ilakip ang nakumpirmang mga litrato" : "Attach confirmed photos"}</button></details>}
    <p role="status" aria-live="polite">{pending ? copy.saving : message ? copy[message] : ""}</p>
    {message && message !== "saved" && <button type="button" className="button button-quiet" disabled={loading || pending} onClick={() => { setLoading(true); setMessage(""); setAttempt(value => value + 1); }}>{locale === "fil" ? "Subukang muli" : "Retry"}</button>}
  </section>;
}
