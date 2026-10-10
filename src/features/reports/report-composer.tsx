"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useLocale } from "@/features/i18n/use-locale";
import type { EvidenceAsset } from "./report-module";
import type { DuplicateSuggestion } from "./engagement-module";
import { EvidencePicker } from "./evidence-picker";
import { LocationPicker } from "./location-picker";
import { clearLocalPhotos } from "./evidence-drafts";

const draftKey = "ayos-report-draft-v1";
const draftEvent = "ayos-report-draft-change";
type Draft = {
  version: 1;
  idempotencyKey: string;
  category: string;
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
type FieldIssues = Record<string, string>;
const copy = {
  en: {
    title: "Tell us what needs attention.",
    lead: "For non-emergency concerns in Southville 1. Your identity, exact location, and original photos stay private. Only a reviewed safe summary may become public.",
    draft: "You have an unfinished private draft on this device.",
    resume: "Resume draft",
    discard: "Discard draft",
    danger:
      "Is anyone in immediate danger or does this need urgent police, fire, medical, or rescue help?",
    category: "Category",
    categoryPlaceholder: "Choose a category",
    description: "Describe the concern",
    descriptionHelp:
      "Use 20–1,000 characters. Include what happened and how residents are affected. Do not include names or exact home addresses.",
    landmark: "Nearby landmark",
    landmarkHelp:
      "Use an approximate, recognizable public place. Operators review it before publication.",
    location: "Issue location · private",
    locationHelp:
      "Optional coordinates and household details stay private. Any public point is deliberately approximate.",
    privateDetails: "Private block, lot, or access details",
    nonEmergency: "I confirm this is not an emergency.",
    publicSummary:
      "I understand that only a reviewed safe summary and approximate area may appear publicly.",
    submit: "Submit report",
    submitting: "Submitting…",
    errorTitle: "Please review the highlighted fields.",
    networkError:
      "We could not confirm the submission. Keep this draft unchanged and retry to recover the same receipt without creating a duplicate.",
    back: "Back to account",
    retry: "Check submission again",
  },
  fil: {
    title: "Ibahagi kung ano ang kailangang ayusin.",
    lead: "Para sa hindi emergency na concern sa Southville 1. Pribado ang iyong identity, eksaktong lokasyon, at orihinal na litrato. Reviewed na ligtas na summary lamang ang maaaring makita sa publiko.",
    draft: "May hindi natapos na pribadong draft sa device na ito.",
    resume: "Ipagpatuloy ang draft",
    discard: "Burahin ang draft",
    danger:
      "May nasa agarang panganib ba o kailangan ng mabilis na tulong ng pulis, bumbero, medikal, o rescue?",
    category: "Kategorya",
    categoryPlaceholder: "Pumili ng kategorya",
    description: "Ilarawan ang concern",
    descriptionHelp:
      "Gumamit ng 20–1,000 character. Isama ang nangyari at epekto sa mga residente. Huwag maglagay ng pangalan o eksaktong address.",
    landmark: "Malapit na landmark",
    landmarkHelp:
      "Gumamit ng tinatayang pampublikong lugar na madaling makilala. Susuriin ito bago ilathala.",
    location: "Lokasyon ng concern · pribado",
    locationHelp:
      "Opsyonal at pribado ang coordinates at household details. Tinatayang lokasyon lamang ang makikita sa publiko.",
    privateDetails: "Pribadong block, lot, o detalye ng pagpunta",
    nonEmergency: "Kinukumpirma kong hindi ito emergency.",
    publicSummary:
      "Nauunawaan kong reviewed na ligtas na summary at tinatayang lugar lamang ang maaaring makita sa publiko.",
    submit: "Isumite ang ulat",
    submitting: "Isinusumite…",
    errorTitle: "Suriin ang mga field na may marka.",
    networkError:
      "Hindi makumpirma ang submission. Huwag baguhin ang draft; subukan muli upang mabawi ang parehong receipt nang walang duplicate.",
    back: "Bumalik sa account",
    retry: "Suriin muli ang submission",
  },
};
function subscribe(onChange: () => void) {
  window.addEventListener(draftEvent, onChange);
  return () => window.removeEventListener(draftEvent, onChange);
}
function readDraft(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function parseDraft(value: string | null): Draft | null {
  if (!value) return null;
  try {
    const draft = JSON.parse(value);
    if (
      draft.version !== 1 ||
      typeof draft.idempotencyKey !== "string" ||
      !/^[a-zA-Z0-9_-]{12,128}$/.test(draft.idempotencyKey) ||
      ["category", "description", "nearbyLandmark"].some(
        (field) => typeof draft[field] !== "string",
      ) ||
      ["isEmergency", "confirmNonEmergency", "confirmPublicSummary"].some(
        (field) => typeof draft[field] !== "boolean",
      )
    )
      return null;
    return {
      ...draft,
      latitude: typeof draft.latitude === "string" ? draft.latitude : "",
      longitude: typeof draft.longitude === "string" ? draft.longitude : "",
      privateLocationDetails:
        typeof draft.privateLocationDetails === "string"
          ? draft.privateLocationDetails
          : "",
    };
  } catch {
    return null;
  }
}
type Category = { id: string; label: { en: string; fil: string } };
type Guidance = { message: string; phone: string; sourceUrl: string };
const fallbackCategories: Category[] = [
  {
    id: "roads-drainage",
    label: { en: "Roads and drainage", fil: "Kalsada at kanal" },
  },
  {
    id: "streetlights",
    label: { en: "Broken streetlight", fil: "Sirang ilaw sa kalsada" },
  },
  {
    id: "waste-collection",
    label: { en: "Waste collection", fil: "Koleksyon ng basura" },
  },
];
const fieldIds: Record<string, string> = {
  category: "report-category",
  description: "report-description",
  nearbyLandmark: "nearby-landmark",
  exactLocation: "latitude",
  evidence: "evidence-photos",
  confirmNonEmergency: "confirm-non-emergency",
  confirmPublicSummary: "confirm-public-summary",
};

export function ReportComposer({
  emergencyGuidance,
  categories = fallbackCategories,
  residentUid,
}: {
  emergencyGuidance: { en: Guidance; fil: Guidance };
  categories?: Category[];
  residentUid?: string;
}) {
  const router = useRouter();
  const { locale, chooseLocale } = useLocale();
  const fil = locale === "fil";
  const message = copy[locale];
  const guidance = emergencyGuidance[locale];
  const storageKey = residentUid ? `${draftKey}:${residentUid}` : draftKey;
  const [draft, setDraft] = useState<Draft>(blankDraft);
  const savedText = useSyncExternalStore(
    subscribe,
    () => readDraft(storageKey),
    () => null,
  );
  const savedDraft = useMemo(() => parseDraft(savedText), [savedText]);
  const [issues, setIssues] = useState<FieldIssues>({});
  const [submitError, setSubmitError] = useState("");
  const [pending, setPending] = useState(false);
  const [ambiguous, setAmbiguous] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceAsset[]>([]);
  const [uploadBlocked, setUploadBlocked] = useState(false);
  const [suggestions, setSuggestions] = useState<DuplicateSuggestion[]>([]);
  const [duplicatesReviewed, setDuplicatesReviewed] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const duplicateHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!draft.category && !draft.description && !draft.nearbyLandmark) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      queueMicrotask(() => setStorageError(true));
    }
  }, [draft, storageKey]);

  function update<Key extends keyof Draft>(key: Key, value: Draft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (["category", "latitude", "longitude"].includes(key)) {
      setDuplicatesReviewed(false);
      setSuggestions([]);
    }
  }
  function clearDraft() {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* Receipt is authoritative even without device storage. */
    }
    window.dispatchEvent(new Event(draftEvent));
    if (residentUid)
      void clearLocalPhotos(residentUid, draft.idempotencyKey).catch(
        () => undefined,
      );
  }
  function discardDraft() {
    clearDraft();
    setDraft(blankDraft());
    setIssues({});
    setSubmitError("");
    setAmbiguous(false);
    setResumed(false);
    setDuplicatesReviewed(false);
    setSuggestions([]);
  }
  function validate() {
    const next: FieldIssues = {};
    if (!categories.some((item) => item.id === draft.category))
      next.category = fil ? "Pumili ng kategorya." : "Choose a category.";
    if (
      draft.description.trim().length < 20 ||
      draft.description.trim().length > 1000
    )
      next.description = fil
        ? "Gumamit ng 20–1,000 character."
        : "Use 20–1,000 characters.";
    if (
      draft.nearbyLandmark.trim().length < 3 ||
      draft.nearbyLandmark.trim().length > 160
    )
      next.nearbyLandmark = fil
        ? "Maglagay ng landmark na may 3–160 character."
        : "Add a landmark with 3–160 characters.";
    if (
      (draft.latitude || draft.longitude) &&
      (!draft.latitude ||
        !draft.longitude ||
        !Number.isFinite(Number(draft.latitude)) ||
        !Number.isFinite(Number(draft.longitude)) ||
        Math.abs(Number(draft.latitude)) > 90 ||
        Math.abs(Number(draft.longitude)) > 180)
    )
      next.exactLocation = fil
        ? "Maglagay ng wastong latitude at longitude, o alisin ang pareho."
        : "Enter valid latitude and longitude, or clear both.";
    if (draft.privateLocationDetails && !draft.latitude)
      next.exactLocation = fil
        ? "Maglagay ng coordinates para sa pribadong detalye, o alisin ang detalye."
        : "Add coordinates for the private details, or clear the details.";
    if (!draft.confirmNonEmergency)
      next.confirmNonEmergency = fil
        ? "Kumpirmahing hindi ito emergency."
        : "Confirm this is not an emergency.";
    if (!draft.confirmPublicSummary)
      next.confirmPublicSummary = fil
        ? "Kumpirmahin ang pampublikong summary."
        : "Confirm the public summary.";
    return next;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (residentUid && (ambiguous || resumed)) {
      setPending(true);
      try {
        const response = await fetch(
          `/api/reports/receipt?draftKey=${encodeURIComponent(draft.idempotencyKey)}`,
          { cache: "no-store" },
        );
        if (response.ok) {
          const receipt = (await response.json()) as { reference: string };
          clearDraft();
          router.push(`/reports/${receipt.reference}`);
          return;
        }
        if (response.status !== 404) throw new Error("Receipt unconfirmed");
      } catch {
        setSubmitError(message.networkError);
        return;
      } finally {
        setPending(false);
      }
    }
    if (uploadBlocked && !ambiguous) return;
    const next = validate();
    if (ambiguous) delete next.category;
    setIssues(next);
    setSubmitError("");
    if (draft.isEmergency || Object.keys(next).length) {
      setTimeout(() => summaryRef.current?.focus(), 0);
      return;
    }
    setPending(true);
    let submissionStarted = false;
    try {
      if (
        !duplicatesReviewed &&
        !ambiguous &&
        draft.latitude &&
        draft.longitude
      ) {
        const response = await fetch("/api/reports/suggestions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            category: draft.category,
            latitude: Number(draft.latitude),
            longitude: Number(draft.longitude),
          }),
        });
        if (!response.ok) throw new Error("Duplicate check unavailable");
        const result = (await response.json()) as {
          suggestions: DuplicateSuggestion[];
        };
        if (result.suggestions.length) {
          setSuggestions(result.suggestions);
          setTimeout(() => duplicateHeading.current?.focus(), 0);
          return;
        }
        setDuplicatesReviewed(true);
      }
      submissionStarted = true;
      const response = await fetch("/api/reports", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...draft,
          exactLocation:
            draft.latitude && draft.longitude
              ? {
                  latitude: Number(draft.latitude),
                  longitude: Number(draft.longitude),
                  privateDetails: draft.privateLocationDetails,
                }
              : undefined,
          evidence,
        }),
      });
      const result = (await response.json()) as {
        reference?: string;
        issues?: FieldIssues;
      };
      if (response.status === 422) {
        const localized: FieldIssues = {};
        for (const field of Object.keys(result.issues ?? {}))
          localized[field] = fil
            ? field === "evidence"
              ? "Gumamit ng nakumpirmang pribadong upload. Subukan muli ang litrato."
              : "Suriin at iwasto ang field na ito."
            : field === "evidence"
              ? "Use confirmed private uploads. Retry the photo."
              : "Review and correct this field.";
        setIssues(localized);
        setAmbiguous(false);
        setTimeout(() => summaryRef.current?.focus(), 0);
        return;
      }
      if (response.status === 401 || response.status === 403) {
        setSubmitError(
          fil
            ? "Mag-sign in muli at tiyaking aprubado ang pilot access. Nananatili ang draft."
            : "Sign in again and confirm pilot approval. Your draft remains.",
        );
        return;
      }
      if (!response.ok || !result.reference)
        throw new Error("Submission unconfirmed");
      clearDraft();
      router.push(`/reports/${result.reference}`);
    } catch {
      setAmbiguous(submissionStarted);
      setSubmitError(
        submissionStarted
          ? message.networkError
          : fil
            ? "Hindi available ang duplicate check. Nananatili ang draft; kumonekta at subukan muli."
            : "Duplicate checking is unavailable. Your draft remains; reconnect and retry.",
      );
    } finally {
      setPending(false);
    }
  }
  async function supportSuggestion(reference: string) {
    setPending(true);
    try {
      const response = await fetch(`/api/reports/${reference}/engagement`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "affected", active: true }),
      });
      if (!response.ok) throw new Error("Support unconfirmed");
      clearDraft();
      router.push(`/reports/${reference}`);
    } catch {
      setSubmitError(
        fil
          ? "Hindi makumpirma ang update. Ligtas ang draft; subukan muli."
          : "The update could not be confirmed. Your draft remains; retry.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="composer-page">
      <header className="composer-header">
        <Link className="brand" href="/">
          Ayos Southville
        </Link>
        <div className="intake-header-actions">
          <button
            type="button"
            className="button button-quiet"
            onClick={() => chooseLocale(fil ? "en" : "fil")}
            aria-label={fil ? "Switch to English" : "Lumipat sa Filipino"}
          >
            {fil ? "English" : "Filipino"}
          </button>
          <Link className="text-link" href="/account">
            {message.back}
          </Link>
        </div>
      </header>
      <div className="composer-layout">
        <section className="composer-copy">
          <h1>{message.title}</h1>
          <p>{message.lead}</p>
          <p>
            {fil
              ? "Independent at resident-led na pilot. Hindi ito emergency o opisyal na government dispatch service."
              : "An independent resident-led pilot—not an emergency or official government dispatch service."}
          </p>
        </section>
        <section
          className="composer-card"
          aria-label={fil ? "Form ng ulat" : "Report form"}
        >
          {savedDraft &&
            savedDraft.idempotencyKey !== draft.idempotencyKey &&
            !ambiguous && (
              <div className="draft-banner">
                <p>{message.draft}</p>
                <div>
                  <button
                    type="button"
                    className="button button-dark"
                    disabled={pending}
                    onClick={() => {
                      setDraft(savedDraft);
                      setResumed(true);
                      setDuplicatesReviewed(false);
                      setSuggestions([]);
                    }}
                  >
                    {message.resume}
                  </button>
                  <button
                    type="button"
                    className="button button-quiet"
                    disabled={pending}
                    onClick={discardDraft}
                  >
                    {message.discard}
                  </button>
                </div>
              </div>
            )}
          {storageError && (
            <p role="status" className="field-error">
              {fil
                ? "Hindi available ang device storage. Panatilihing bukas ang tab hanggang makuha ang receipt."
                : "Device draft storage is unavailable. Keep this tab open until you receive a receipt."}
            </p>
          )}
          <form ref={formRef} onSubmit={submit} noValidate>
            {Object.keys(issues).length > 0 && (
              <div
                ref={summaryRef}
                className="error-summary"
                role="alert"
                tabIndex={-1}
              >
                <strong>{message.errorTitle}</strong>
                <ul>
                  {Object.entries(issues).map(([field, issue]) => (
                    <li key={field}>
                      <a href={`#${fieldIds[field] ?? "report-category"}`}>
                        {issue}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <fieldset
              className="composer-fields"
              disabled={pending || ambiguous}
            >
              <legend className="sr-only">
                {fil ? "Detalye ng concern" : "Concern details"}
              </legend>
              <label className="check-row emergency-check">
                <input
                  type="checkbox"
                  checked={draft.isEmergency}
                  onChange={(event) =>
                    update("isEmergency", event.target.checked)
                  }
                />
                <span>{message.danger}</span>
              </label>
              {draft.isEmergency && (
                <div className="emergency-guidance" role="alert">
                  <strong>
                    {guidance.message}{" "}
                    <a href={`tel:${guidance.phone}`}>{guidance.phone}</a>.
                  </strong>
                  <a href={guidance.sourceUrl} target="_blank" rel="noreferrer">
                    {fil
                      ? "Opisyal na sanggunian ng hotline"
                      : "Official hotline source"}
                  </a>
                </div>
              )}
              <label htmlFor="report-category">{message.category}</label>
              <select
                id="report-category"
                value={draft.category}
                onChange={(event) => update("category", event.target.value)}
                aria-invalid={Boolean(issues.category)}
                aria-describedby={
                  issues.category ? "category-error" : undefined
                }
              >
                <option value="">{message.categoryPlaceholder}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label[locale]}
                  </option>
                ))}
              </select>
              {issues.category && (
                <p id="category-error" className="field-error">
                  {issues.category}
                </p>
              )}
              <label htmlFor="report-description">{message.description}</label>
              <p id="description-help" className="field-help">
                {message.descriptionHelp}
              </p>
              <textarea
                id="report-description"
                maxLength={1000}
                value={draft.description}
                onChange={(event) => update("description", event.target.value)}
                rows={6}
                aria-invalid={Boolean(issues.description)}
                aria-describedby={`description-help${issues.description ? " description-error" : ""}`}
              />
              {issues.description && (
                <p id="description-error" className="field-error">
                  {issues.description}
                </p>
              )}
              <label htmlFor="nearby-landmark">{message.landmark}</label>
              <p id="landmark-help" className="field-help">
                {message.landmarkHelp}
              </p>
              <input
                id="nearby-landmark"
                maxLength={160}
                value={draft.nearbyLandmark}
                onChange={(event) =>
                  update("nearbyLandmark", event.target.value)
                }
                aria-invalid={Boolean(issues.nearbyLandmark)}
                aria-describedby={`landmark-help${issues.nearbyLandmark ? " landmark-error" : ""}`}
              />
              {issues.nearbyLandmark && (
                <p id="landmark-error" className="field-error">
                  {issues.nearbyLandmark}
                </p>
              )}
              <fieldset className="location-fieldset">
                <legend>{message.location}</legend>
                <p id="location-help" className="field-help">
                  {message.locationHelp}
                </p>
                <LocationPicker
                  latitude={draft.latitude}
                  longitude={draft.longitude}
                  locale={locale}
                  onSelect={(latitude, longitude) => {
                    setDraft((current) => ({
                      ...current,
                      latitude,
                      longitude,
                    }));
                    setDuplicatesReviewed(false);
                    setSuggestions([]);
                  }}
                />
                <div className="coordinate-grid">
                  <label htmlFor="latitude">
                    Latitude
                    <input
                      id="latitude"
                      inputMode="decimal"
                      value={draft.latitude}
                      onChange={(event) =>
                        update("latitude", event.target.value)
                      }
                      aria-invalid={Boolean(issues.exactLocation)}
                      aria-describedby={`location-help${issues.exactLocation ? " location-error" : ""}`}
                    />
                  </label>
                  <label htmlFor="longitude">
                    Longitude
                    <input
                      id="longitude"
                      inputMode="decimal"
                      value={draft.longitude}
                      onChange={(event) =>
                        update("longitude", event.target.value)
                      }
                      aria-invalid={Boolean(issues.exactLocation)}
                      aria-describedby="location-help"
                    />
                  </label>
                </div>
                <label htmlFor="private-location">
                  {message.privateDetails}
                </label>
                <input
                  id="private-location"
                  maxLength={200}
                  value={draft.privateLocationDetails}
                  onChange={(event) =>
                    update("privateLocationDetails", event.target.value)
                  }
                />
                {issues.exactLocation && (
                  <p id="location-error" className="field-error">
                    {issues.exactLocation}
                  </p>
                )}
              </fieldset>
              {residentUid && (
                <EvidencePicker
                  key={draft.idempotencyKey}
                  owner={residentUid}
                  draftKey={draft.idempotencyKey}
                  locale={locale}
                  onAssets={setEvidence}
                  onBlocked={setUploadBlocked}
                />
              )}
              {issues.evidence && (
                <p className="field-error">{issues.evidence}</p>
              )}
              <label className="check-row">
                <input
                  id="confirm-non-emergency"
                  type="checkbox"
                  checked={draft.confirmNonEmergency}
                  onChange={(event) =>
                    update("confirmNonEmergency", event.target.checked)
                  }
                  aria-invalid={Boolean(issues.confirmNonEmergency)}
                  aria-describedby={
                    issues.confirmNonEmergency
                      ? "confirm-non-emergency-error"
                      : undefined
                  }
                />
                <span>{message.nonEmergency}</span>
              </label>
              {issues.confirmNonEmergency && (
                <p id="confirm-non-emergency-error" className="field-error">
                  {issues.confirmNonEmergency}
                </p>
              )}
              <label className="check-row">
                <input
                  id="confirm-public-summary"
                  type="checkbox"
                  checked={draft.confirmPublicSummary}
                  onChange={(event) =>
                    update("confirmPublicSummary", event.target.checked)
                  }
                  aria-invalid={Boolean(issues.confirmPublicSummary)}
                  aria-describedby={
                    issues.confirmPublicSummary
                      ? "confirm-public-summary-error"
                      : undefined
                  }
                />
                <span>{message.publicSummary}</span>
              </label>
              {issues.confirmPublicSummary && (
                <p id="confirm-public-summary-error" className="field-error">
                  {issues.confirmPublicSummary}
                </p>
              )}
            </fieldset>
            {suggestions.length > 0 && !duplicatesReviewed && (
              <section
                className="duplicate-panel"
                aria-labelledby="duplicate-title"
              >
                <h2 id="duplicate-title" ref={duplicateHeading} tabIndex={-1}>
                  {fil
                    ? "Maaaring naiulat na ito"
                    : "This may already be reported"}
                </h2>
                <p>
                  {fil
                    ? "Pampublikong ulat lamang ang ipinapakita. Ang pagpiling apektado rin ay hindi mag-aattach ng iyong draft photos."
                    : "Only public reports are shown. Choosing affected will not attach your draft photos."}
                </p>
                <ul>
                  {suggestions.map((suggestion) => (
                    <li key={suggestion.reference}>
                      <div>
                        <Link
                          href={`/reports/${suggestion.reference}`}
                          target="_blank"
                        >
                          {suggestion.reference}
                        </Link>
                        <span>
                          {suggestion.distanceKm} km ·{" "}
                          {fil
                            ? "Parehong kategorya · malapit · hindi pa tapos"
                            : "Same category · nearby · unresolved"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="button button-dark"
                        disabled={pending}
                        onClick={() =>
                          void supportSuggestion(suggestion.reference)
                        }
                      >
                        {fil ? "Apektado rin ako" : "I'm affected too"}
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="button button-quiet"
                  disabled={pending}
                  onClick={() => {
                    setDuplicatesReviewed(true);
                    setSuggestions([]);
                  }}
                >
                  {fil
                    ? "Hindi kaugnay — magpatuloy sa bagong ulat"
                    : "Not related — continue with a new report"}
                </button>
              </section>
            )}
            <p className="form-error" role="status" aria-live="polite">
              {submitError}
            </p>
            <button
              className="button button-primary composer-submit"
              type="submit"
              disabled={
                pending ||
                draft.isEmergency ||
                (uploadBlocked && !ambiguous && !resumed) ||
                (suggestions.length > 0 && !duplicatesReviewed)
              }
            >
              {pending
                ? message.submitting
                : ambiguous
                  ? message.retry
                  : message.submit}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
