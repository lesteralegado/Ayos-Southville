"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useLocale } from "@/features/i18n/use-locale";
import type { ReportCategory } from "./report-module";
import type { DuplicateSuggestion } from "./engagement-module";
import { compressEvidencePhoto, validateEvidenceFiles } from "./media-evidence";

const draftKey = "ayos-report-draft-v1";
const draftEvent = "ayos-report-draft-change";

type Draft = {
  version: 1;
  idempotencyKey: string;
  category: ReportCategory | "";
  description: string;
  nearbyLandmark: string;
  latitude: string;
  longitude: string;
  privateLocationDetails: string;
  isEmergency: boolean;
  confirmNonEmergency: boolean;
  confirmPublicSummary: boolean;
};

const blankDraft = (): Draft => ({
  version: 1,
  idempotencyKey: crypto.randomUUID(),
  category: "",
  description: "",
  nearbyLandmark: "",
  latitude: "",
  longitude: "",
  privateLocationDetails: "",
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
    location: "Pin the issue location",
    locationHelp: "Coordinates and block or lot details stay private. The public sees a rounded approximate point.",
    useLocation: "Use my current location",
    privateDetails: "Private block, lot, or access details",
    photos: "Evidence photos",
    photosHelp: "Up to 5 JPEG, PNG, or WebP photos. We resize large photos before upload; evidence stays restricted until reviewed.",
    nonEmergency: "I confirm this is not an emergency.",
    publicSummary: "I understand that only a reviewed safe summary and approximate area may appear publicly.",
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
    location: "I-pin ang lokasyon ng concern",
    locationHelp: "Pribado ang coordinates at block o lot. Tinatayang lokasyon lamang ang makikita sa publiko.",
    useLocation: "Gamitin ang kasalukuyang lokasyon",
    privateDetails: "Pribadong block, lot, o detalye ng pagpunta",
    photos: "Mga litrato bilang ebidensya",
    photosHelp: "Hanggang 5 JPEG, PNG, o WebP. Pinaliliit ang malalaking litrato at mananatiling restricted hanggang ma-review.",
    nonEmergency: "Kinukumpirma kong hindi ito emergency.",
    publicSummary: "Nauunawaan kong reviewed na ligtas na summary at tinatayang lugar lamang ang maaaring makita sa publiko.",
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

function parseStoredDraft(value: string | null): Draft | null {
  if (!value) return null;
  try {
    const draft = JSON.parse(value) as Record<string, unknown>;
    if (draft.version !== 1 || typeof draft.idempotencyKey !== "string" || typeof draft.category !== "string" || typeof draft.description !== "string" || typeof draft.nearbyLandmark !== "string" || typeof draft.isEmergency !== "boolean" || typeof draft.confirmNonEmergency !== "boolean" || typeof draft.confirmPublicSummary !== "boolean") return null;
    draft.latitude = typeof draft.latitude === "string" ? draft.latitude : "";
    draft.longitude = typeof draft.longitude === "string" ? draft.longitude : "";
    draft.privateLocationDetails = typeof draft.privateLocationDetails === "string" ? draft.privateLocationDetails : "";
    return draft as Draft;
  } catch {
    return null;
  }
}

type ComposerCategory = { id: string; label: { en: string; fil: string } };

export function ReportComposer({ emergencyGuidance, categories }: { emergencyGuidance: { en: { message: string; phone: string; sourceUrl: string }; fil: { message: string; phone: string; sourceUrl: string } }; categories?: ComposerCategory[] }) {
  const router = useRouter();
  const { locale } = useLocale();
  const activeEmergencyGuidance = locale === "fil" ? emergencyGuidance.fil : emergencyGuidance.en;
  const message = copy[locale];
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const savedDraftText = useSyncExternalStore(subscribeToStoredDraft, readStoredDraft, () => null);
  const savedDraft = useMemo(() => parseStoredDraft(savedDraftText), [savedDraftText]);
  const [issues, setIssues] = useState<FieldIssues>({});
  const [submitError, setSubmitError] = useState("");
  const [pending, setPending] = useState(false);
  const [evidence, setEvidence] = useState<Array<{ file: File; preview: string }>>([]);
  const [evidenceMessage, setEvidenceMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [suggestions, setSuggestions] = useState<DuplicateSuggestion[]>([]);
  const [duplicatesReviewed, setDuplicatesReviewed] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

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
    if (draft.isEmergency || Object.keys(nextIssues).length) {
      setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    if (!duplicatesReviewed && draft.latitude && draft.longitude) {
      setPending(true);
      try {
        const response = await fetch("/api/reports/suggestions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ category: draft.category, latitude: Number(draft.latitude), longitude: Number(draft.longitude) }) });
        const result = await response.json() as { suggestions?: DuplicateSuggestion[] };
        if (result.suggestions?.length) {
          setSuggestions(result.suggestions);
          return;
        }
        setDuplicatesReviewed(true);
      } catch {
        setSubmitError(message.networkError);
        return;
      } finally {
        setPending(false);
      }
    }
    setPending(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, exactLocation: draft.latitude && draft.longitude ? { latitude: Number(draft.latitude), longitude: Number(draft.longitude), privateDetails: draft.privateLocationDetails } : undefined, evidence: evidence.map(({ file }) => ({ id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, visibility: "restricted" })) }),
      });
      const result = await response.json() as { reference?: string; issues?: FieldIssues };
      if (response.status === 422 && result.issues) {
        setIssues(result.issues);
        return;
      }
      if (!response.ok || !result.reference) throw new Error("Unconfirmed submission");
      window.localStorage.removeItem(draftKey);
      router.push(`/reports/${result.reference}`);
    } catch {
      setSubmitError(message.networkError);
    } finally {
      setPending(false);
    }
  }

  const update = <Key extends keyof Draft>(key: Key, value: Draft[Key]) => setDraft((current) => ({ ...current, [key]: value }));

  async function selectEvidence(files: File[]) {
    setSelectedFiles(files);
    setEvidenceMessage("Preparing photos⬦");
    try {
      const checked = validateEvidenceFiles(files);
      const prepared = await Promise.all(checked.files.map(compressEvidencePhoto));
      evidence.forEach(({ preview }) => URL.revokeObjectURL(preview));
      setEvidence(prepared.map((file) => ({ file, preview: URL.createObjectURL(file) })));
      setEvidenceMessage(checked.issues.join(" ") || `${prepared.length} photo${prepared.length === 1 ? "" : "s"} ready and restricted.`);
    } catch {
      setEvidenceMessage("We could not prepare the photos. Your report is safe; retry or choose them again.");
    }
  }

  async function supportSuggestion(reference: string) {
    setPending(true);
    try {
      const response = await fetch(`/api/reports/${reference}/engagement`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "affected", active: true, evidence: evidence.map(({ file }) => ({ id: crypto.randomUUID(), name: file.name, type: file.type, size: file.size, visibility: "restricted" })) }) });
      if (!response.ok) throw new Error("Could not support report");
      window.localStorage.removeItem(draftKey);
      router.push(`/reports/${reference}`);
    } catch {
      setSubmitError(locale === "fil" ? "Hindi ma-update ang ulat. Ligtas ang draft; subukan muli." : "We could not update the report. Your draft is safe; retry.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="composer-page">
      <header className="composer-header"><Link className="brand" href="/">Ayos Southville</Link><Link className="text-link" href="/account">{message.back}</Link></header>
      <div className="composer-layout">
        <section className="composer-copy"><span className="eyebrow">{message.kicker}</span><h1>{message.title}</h1><p>{message.lead}</p></section>
        <section className="composer-card">
          {savedDraft && <div className="draft-banner"><p>{message.draft}</p><div><button type="button" className="button button-dark" onClick={() => setDraft(savedDraft)}>{message.resume}</button><button type="button" className="button button-quiet" onClick={discardDraft}>{message.discard}</button></div></div>}
          <form ref={formRef} onSubmit={submit} noValidate>
            {Object.keys(issues).length > 0 && <div ref={summaryRef} className="error-summary" role="alert" tabIndex={-1}><strong>{message.errorTitle}</strong><ul>{Object.entries(issues).map(([field, issue]) => <li key={field}><a href={`#${field === "category" ? "report-category" : field === "description" ? "report-description" : field === "nearbyLandmark" ? "nearby-landmark" : field === "confirmNonEmergency" ? "confirm-non-emergency" : "confirm-public-summary"}`}>{issue}</a></li>)}</ul></div>}
            <label className="check-row emergency-check"><input type="checkbox" checked={draft.isEmergency} onChange={(event) => update("isEmergency", event.target.checked)} /> <span>{message.danger}</span></label>
            {draft.isEmergency && <div className="emergency-guidance" role="alert"><strong>{activeEmergencyGuidance.message} <a href={`tel:${activeEmergencyGuidance.phone}`}>{activeEmergencyGuidance.phone}</a>.</strong><a href={activeEmergencyGuidance.sourceUrl} target="_blank" rel="noreferrer">Official hotline source</a></div>}
            <label htmlFor="report-category">{message.category}</label>
            <select id="report-category" value={draft.category} onChange={(event) => update("category", event.target.value as Draft["category"])} aria-invalid={Boolean(issues.category)} aria-describedby={issues.category ? "category-error" : undefined}>
              <option value="">{message.categoryPlaceholder}</option>
              {(categories ?? [
                { id: "roads-drainage", label: { en: copy.en.roads, fil: copy.fil.roads } },
                { id: "streetlights", label: { en: copy.en.lights, fil: copy.fil.lights } },
                { id: "waste-collection", label: { en: copy.en.waste, fil: copy.fil.waste } },
              ]).map((category) => <option key={category.id} value={category.id}>{category.label[locale]}</option>)}
            </select>
            {issues.category && <p id="category-error" className="field-error">{issues.category}</p>}
            <label htmlFor="report-description">{message.description}</label><p id="description-help" className="field-help">{message.descriptionHelp}</p>
            <textarea id="report-description" value={draft.description} onChange={(event) => update("description", event.target.value)} rows={6} aria-invalid={Boolean(issues.description)} aria-describedby={`description-help${issues.description ? " description-error" : ""}`} />
            {issues.description && <p id="description-error" className="field-error">{issues.description}</p>}
            <label htmlFor="nearby-landmark">{message.landmark}</label><p id="landmark-help" className="field-help">{message.landmarkHelp}</p>
            <input id="nearby-landmark" value={draft.nearbyLandmark} onChange={(event) => update("nearbyLandmark", event.target.value)} aria-invalid={Boolean(issues.nearbyLandmark)} aria-describedby={`landmark-help${issues.nearbyLandmark ? " landmark-error" : ""}`} />
            {issues.nearbyLandmark && <p id="landmark-error" className="field-error">{issues.nearbyLandmark}</p>}
            {suggestions.length > 0 && !duplicatesReviewed && <section className="duplicate-panel" aria-labelledby="duplicate-title">
              <h2 id="duplicate-title">{locale === "fil" ? "Maaaring naiulat na ito" : "This may already be reported"}</h2>
              <p>{locale === "fil" ? "Suriin ang mga malapit na unresolved na concern bago gumawa ng bago." : "Review nearby unresolved concerns before creating a new one."}</p>
              <ul>{suggestions.map((suggestion) => <li key={suggestion.reference}><div><strong>{suggestion.reference}</strong><span>{suggestion.distanceKm} km · {suggestion.reasons.join(" · ")}</span></div><button type="button" className="button button-dark" onClick={() => void supportSuggestion(suggestion.reference)}>{locale === "fil" ? "Apektado rin ako" : "I'm affected too"}</button></li>)}</ul>
              <button type="button" className="text-link" onClick={() => { setDuplicatesReviewed(true); setSuggestions([]); setTimeout(() => formRef.current?.requestSubmit(), 0); }}>{locale === "fil" ? "Hindi kaugnay � magsumite ng bagong ulat" : "Not related � submit a new report"}</button>
            </section>}
            <fieldset className="location-fieldset">
              <legend>{message.location}</legend><p className="field-help">{message.locationHelp}</p>
              <div className="location-picker" aria-label="Map location picker" onClick={(event) => { const box = event.currentTarget.getBoundingClientRect(); update("latitude", (14.276 + ((event.clientY - box.top) / box.height) * .012).toFixed(6)); update("longitude", (121.12 + ((event.clientX - box.left) / box.width) * .016).toFixed(6)); }}>
                <span className="map-road map-road-a" /><span className="map-road map-road-b" />
                {draft.latitude && <span className="location-pin" aria-label="Selected location" />}
                <button type="button" className="button button-quiet" onClickCapture={(event) => event.stopPropagation()} onClick={() => navigator.geolocation?.getCurrentPosition((position) => setDraft((current) => ({ ...current, latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) })), () => setEvidenceMessage("Location access was unavailable. Enter coordinates below."))}>{message.useLocation}</button>
              </div>
              <div className="coordinate-grid"><label>Latitude<input inputMode="decimal" value={draft.latitude} onChange={(event) => update("latitude", event.target.value)} /></label><label>Longitude<input inputMode="decimal" value={draft.longitude} onChange={(event) => update("longitude", event.target.value)} /></label></div>
              <label htmlFor="private-location">{message.privateDetails}</label><input id="private-location" maxLength={200} value={draft.privateLocationDetails} onChange={(event) => update("privateLocationDetails", event.target.value)} />
            </fieldset>
            <fieldset className="evidence-fieldset">
              <legend>{message.photos}</legend><p className="field-help">{message.photosHelp}</p>
              <input id="evidence-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => void selectEvidence(Array.from(event.target.files ?? []))} />
              <div className="evidence-previews">{evidence.map(({ file, preview }, index) => <figure key={preview}><img src={preview} alt={`Preview of ${file.name}`} /><figcaption>{file.name}<button type="button" onClick={() => { URL.revokeObjectURL(preview); setEvidence((items) => items.filter((_, itemIndex) => itemIndex !== index)); }}>Remove</button></figcaption></figure>)}</div>
              {evidenceMessage && <p className="field-help" role="status" aria-live="polite">{evidenceMessage} {evidenceMessage.includes("could not") && <button type="button" onClick={() => void selectEvidence(selectedFiles)}>Retry photo preparation</button>}</p>}
            </fieldset>
            <label className="check-row"><input id="confirm-non-emergency" type="checkbox" checked={draft.confirmNonEmergency} onChange={(event) => update("confirmNonEmergency", event.target.checked)} aria-invalid={Boolean(issues.confirmNonEmergency)} aria-describedby={issues.confirmNonEmergency ? "confirm-non-emergency-error" : undefined} /> <span>{message.nonEmergency}</span></label>
            {issues.confirmNonEmergency && <p id="confirm-non-emergency-error" className="field-error">{issues.confirmNonEmergency}</p>}
            <label className="check-row"><input id="confirm-public-summary" type="checkbox" checked={draft.confirmPublicSummary} onChange={(event) => update("confirmPublicSummary", event.target.checked)} aria-invalid={Boolean(issues.confirmPublicSummary)} aria-describedby={issues.confirmPublicSummary ? "confirm-public-summary-error" : undefined} /> <span>{message.publicSummary}</span></label>
            {issues.confirmPublicSummary && <p id="confirm-public-summary-error" className="field-error">{issues.confirmPublicSummary}</p>}
            <p className="form-error" role="status" aria-live="polite">{submitError}</p>
            <button className="button button-primary composer-submit" type="submit" disabled={pending || draft.isEmergency}>{pending && evidence.length ? "Uploading evidence and submitting⬦" : pending ? message.submitting : message.submit}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
