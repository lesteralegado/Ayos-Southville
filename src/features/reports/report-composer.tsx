"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useLocale } from "@/features/i18n/use-locale";
import type { ReportCategory } from "./report-module";

const draftKey = "ayos-report-draft-v1";
const draftEvent = "ayos-report-draft-change";

type Draft = {
  idempotencyKey: string;
  category: ReportCategory | "";
  description: string;
  nearbyLandmark: string;
  isEmergency: boolean;
  confirmNonEmergency: boolean;
  confirmPublicSummary: boolean;
};

const blankDraft = (): Draft => ({
  idempotencyKey: crypto.randomUUID(),
  category: "",
  description: "",
  nearbyLandmark: "",
  isEmergency: false,
  confirmNonEmergency: false,
  confirmPublicSummary: false,
});

const copy = {
  en: {
    kicker: "Resident report",
    title: "Tell us what needs attention.",
    lead: "For non-emergency concerns in Southville 1. Your nearby landmark may appear publicly; your identity will not.",
    draft: "You have an unfinished private draft on this device.",
    resume: "Resume draft",
    discard: "Discard draft",
    danger: "Is anyone in immediate danger or does this need urgent police, fire, medical, or rescue help?",
    emergency: "Do not submit this form. Call the Philippine Unified Emergency Hotline",
    category: "Category",
    categoryPlaceholder: "Choose a category",
    roads: "Roads and drainage",
    lights: "Broken streetlight",
    waste: "Waste collection",
    description: "Describe the concern",
    descriptionHelp: "Include what happened and how residents are affected. Do not include names or exact home addresses.",
    landmark: "Nearby landmark",
    landmarkHelp: "Use an approximate, recognizable public place.",
    nonEmergency: "I confirm this is not an emergency.",
    publicSummary: "I understand the description and nearby landmark may appear publicly.",
    submit: "Submit report",
    submitting: "Submitting…",
    errorTitle: "Please review the highlighted fields.",
    networkError: "We could not confirm the submission. Your draft is safe; retry to check the same submission without creating a duplicate.",
    back: "Back to account",
  },
  fil: {
    kicker: "Ulat ng residente",
    title: "Ibahagi kung ano ang kailangang ayusin.",
    lead: "Para sa hindi emergency na concern sa Southville 1. Maaaring makita sa publiko ang landmark, ngunit hindi ang iyong identity.",
    draft: "May hindi natapos na pribadong draft sa device na ito.",
    resume: "Ipagpatuloy ang draft",
    discard: "Burahin ang draft",
    danger: "May nasa agarang panganib ba o kailangan ng mabilis na tulong ng pulis, bumbero, medikal, o rescue?",
    emergency: "Huwag isumite ang form na ito. Tumawag sa Philippine Unified Emergency Hotline",
    category: "Kategorya",
    categoryPlaceholder: "Pumili ng kategorya",
    roads: "Kalsada at kanal",
    lights: "Sirang ilaw sa kalsada",
    waste: "Koleksyon ng basura",
    description: "Ilarawan ang concern",
    descriptionHelp: "Isama ang nangyari at epekto sa mga residente. Huwag maglagay ng pangalan o eksaktong address.",
    landmark: "Malapit na landmark",
    landmarkHelp: "Gumamit ng tinatayang pampublikong lugar na madaling makilala.",
    nonEmergency: "Kinukumpirma kong hindi ito emergency.",
    publicSummary: "Nauunawaan kong maaaring makita sa publiko ang paglalarawan at landmark.",
    submit: "Isumite ang ulat",
    submitting: "Isinusumite…",
    errorTitle: "Suriin ang mga field na may marka.",
    networkError: "Hindi makumpirma ang submission. Ligtas ang draft; subukan muli gamit ang parehong submission upang maiwasan ang duplicate.",
    back: "Bumalik sa account",
  },
} as const;

type FieldIssues = Partial<Record<"category" | "description" | "nearbyLandmark" | "confirmNonEmergency" | "confirmPublicSummary", string>>;

function localIssues(draft: Draft, locale: "en" | "fil"): FieldIssues {
  const fil = locale === "fil";
  const issues: FieldIssues = {};
  if (!draft.category) issues.category = fil ? "Pumili ng kategorya." : "Choose a category.";
  if (draft.description.trim().length < 20) issues.description = fil ? "Gumamit ng hindi bababa sa 20 character." : "Use at least 20 characters.";
  if (draft.nearbyLandmark.trim().length < 3) issues.nearbyLandmark = fil ? "Maglagay ng landmark." : "Add a nearby landmark.";
  if (!draft.confirmNonEmergency) issues.confirmNonEmergency = fil ? "Kumpirmahing hindi ito emergency." : "Confirm this is not an emergency.";
  if (!draft.confirmPublicSummary) issues.confirmPublicSummary = fil ? "Kumpirmahin ang pampublikong summary." : "Confirm the public summary.";
  return issues;
}

function subscribeToStoredDraft(onStoreChange: () => void) {
  window.addEventListener(draftEvent, onStoreChange);
  return () => window.removeEventListener(draftEvent, onStoreChange);
}

function readStoredDraft() {
  return window.localStorage.getItem(draftKey);
}

export function ReportComposer({ emergencyGuidance }: { emergencyGuidance: { phone: string; sourceUrl: string } }) {
  const router = useRouter();
  const { locale } = useLocale();
  const message = copy[locale];
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const savedDraftText = useSyncExternalStore(subscribeToStoredDraft, readStoredDraft, () => null);
  const savedDraft = useMemo(() => {
    if (!savedDraftText) return null;
    try { return JSON.parse(savedDraftText) as Draft; } catch { return null; }
  }, [savedDraftText]);
  const [issues, setIssues] = useState<FieldIssues>({});
  const [submitError, setSubmitError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const hasContent = draft.category || draft.description || draft.nearbyLandmark;
    if (hasContent) window.localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draft]);

  function discardDraft() {
    window.localStorage.removeItem(draftKey);
    window.dispatchEvent(new Event(draftEvent));
    setDraft(blankDraft());
    setIssues({});
    setSubmitError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextIssues = localIssues(draft, locale);
    setIssues(nextIssues);
    setSubmitError("");
    if (draft.isEmergency || Object.keys(nextIssues).length) return;
    setPending(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await response.json() as { reference?: string; issues?: FieldIssues };
      if (response.status === 422 && result.issues) {
        setIssues(result.issues);
        return;
      }
      if (!response.ok || !result.reference) throw new Error("Unconfirmed submission");
      window.localStorage.removeItem(draftKey);
      router.push(`/reports/${result.reference}?submitted=1`);
    } catch {
      setSubmitError(message.networkError);
    } finally {
      setPending(false);
    }
  }

  const update = <Key extends keyof Draft>(key: Key, value: Draft[Key]) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <main className="composer-page">
      <header className="composer-header"><Link className="brand" href="/">Ayos Southville</Link><Link className="text-link" href="/account">{message.back}</Link></header>
      <div className="composer-layout">
        <section className="composer-copy"><span className="eyebrow">{message.kicker}</span><h1>{message.title}</h1><p>{message.lead}</p></section>
        <section className="composer-card">
          {savedDraft && <div className="draft-banner"><p>{message.draft}</p><div><button type="button" className="button button-dark" onClick={() => setDraft(savedDraft)}>{message.resume}</button><button type="button" className="button button-quiet" onClick={discardDraft}>{message.discard}</button></div></div>}
          <form onSubmit={submit} noValidate>
            {Object.keys(issues).length > 0 && <div className="error-summary" role="alert"><strong>{message.errorTitle}</strong><ul>{Object.values(issues).map((issue) => <li key={issue}>{issue}</li>)}</ul></div>}
            <label className="check-row emergency-check"><input type="checkbox" checked={draft.isEmergency} onChange={(event) => update("isEmergency", event.target.checked)} /> <span>{message.danger}</span></label>
            {draft.isEmergency && <div className="emergency-guidance" role="alert"><strong>{message.emergency} <a href={`tel:${emergencyGuidance.phone}`}>{emergencyGuidance.phone}</a>.</strong><a href={emergencyGuidance.sourceUrl} target="_blank" rel="noreferrer">Official hotline source</a></div>}
            <label htmlFor="report-category">{message.category}</label>
            <select id="report-category" value={draft.category} onChange={(event) => update("category", event.target.value as Draft["category"])} aria-invalid={Boolean(issues.category)} aria-describedby={issues.category ? "category-error" : undefined}>
              <option value="">{message.categoryPlaceholder}</option><option value="roads-drainage">{message.roads}</option><option value="streetlights">{message.lights}</option><option value="waste-collection">{message.waste}</option>
            </select>
            {issues.category && <p id="category-error" className="field-error">{issues.category}</p>}
            <label htmlFor="report-description">{message.description}</label><p id="description-help" className="field-help">{message.descriptionHelp}</p>
            <textarea id="report-description" value={draft.description} onChange={(event) => update("description", event.target.value)} rows={6} aria-invalid={Boolean(issues.description)} aria-describedby={`description-help${issues.description ? " description-error" : ""}`} />
            {issues.description && <p id="description-error" className="field-error">{issues.description}</p>}
            <label htmlFor="nearby-landmark">{message.landmark}</label><p id="landmark-help" className="field-help">{message.landmarkHelp}</p>
            <input id="nearby-landmark" value={draft.nearbyLandmark} onChange={(event) => update("nearbyLandmark", event.target.value)} aria-invalid={Boolean(issues.nearbyLandmark)} aria-describedby={`landmark-help${issues.nearbyLandmark ? " landmark-error" : ""}`} />
            {issues.nearbyLandmark && <p id="landmark-error" className="field-error">{issues.nearbyLandmark}</p>}
            <label className="check-row"><input type="checkbox" checked={draft.confirmNonEmergency} onChange={(event) => update("confirmNonEmergency", event.target.checked)} /> <span>{message.nonEmergency}</span></label>
            {issues.confirmNonEmergency && <p className="field-error">{issues.confirmNonEmergency}</p>}
            <label className="check-row"><input type="checkbox" checked={draft.confirmPublicSummary} onChange={(event) => update("confirmPublicSummary", event.target.checked)} /> <span>{message.publicSummary}</span></label>
            {issues.confirmPublicSummary && <p className="field-error">{issues.confirmPublicSummary}</p>}
            <p className="form-error" role="status" aria-live="polite">{submitError}</p>
            <button className="button button-primary composer-submit" type="submit" disabled={pending || draft.isEmergency}>{pending ? message.submitting : message.submit}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
