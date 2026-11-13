"use client";
import { operatingCopy } from "@/features/i18n/operating-copy";

import Link from "next/link";
import { residentFlowCopy } from "./resident-flow-copy";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef } from "react";
import { useReportSubmission } from "./use-report-submission";
import { useLocale } from "@/features/i18n/use-locale";
import { EvidencePicker } from "./evidence-picker";
import { LocationPicker } from "./location-picker";
import type { PilotOperations } from "@/features/admin/pilot-operations";

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
    back: "Bumalik sa account",
    retry: "Suriin muli ang submission",
  },
};
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
  operatingStatus,
}: {
  emergencyGuidance: { en: Guidance; fil: Guidance };
  categories?: Category[];
  residentUid?: string;
  operatingStatus?: Pick<PilotOperations, "intakePaused" | "explanation" | "resumesAt">;
}) {
  const router = useRouter();
  const { locale, chooseLocale } = useLocale();
  const fil = locale === "fil";
  const message = copy[locale];
  const flowCopy = residentFlowCopy[locale];
  const guidance = emergencyGuidance[locale];
  const workflow = useReportSubmission({ residentUid, categories, operatingStatus, locale });
  const {
    draft, savedDraft, issues, submitError, pending, ambiguous, resumed, availability,
    availabilityConfirmed, checkingAvailability, storageError, suggestions, duplicatesReviewed,
    uploadBlocked, update, resumeDraft, discardDraft, supportSuggestion, refreshAvailability,
    reviewDuplicates, setEvidence, setUploadBlocked,
  } = workflow;
  const summaryRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const duplicateHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (workflow.phase === "confirmed" && workflow.reference)
      router.push(`/reports/${workflow.reference}`);
  }, [workflow.phase, workflow.reference, router]);
  useEffect(() => {
    if (!Object.keys(issues).length) return;
    const timer = setTimeout(() => summaryRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [issues]);
  useEffect(() => {
    if (!suggestions.length) return;
    const timer = setTimeout(() => duplicateHeading.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [suggestions]);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void workflow.submit();
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
          {availability?.intakePaused && <div className="draft-banner" role="status">
            <h2>{operatingCopy(locale, "newReportsArePaused")}</h2>
            <p>{availability.explanation[locale] || (operatingCopy(locale, "yourDraftRemainsRetryAfterIntakeResumes"))}</p>
            <p>{availability.resumesAt ? (operatingCopy(locale, "expectedResumption")) + new Date(availability.resumesAt).toLocaleString(locale === "fil" ? "fil-PH" : "en-PH", { timeZone: "Asia/Manila" }) : !availabilityConfirmed ? (operatingCopy(locale, "resumptionDetailsCouldNotBeConfirmedCheckAvailability")) : operatingCopy(locale, "resumptionTimeIsNotYetKnown")}</p>
            <p>{operatingCopy(locale, "thisIsNotARepairDeadlineExistingReports")}</p>
            <button type="button" className="button button-quiet" disabled={checkingAvailability || pending} onClick={() => void refreshAvailability()}>{checkingAvailability ? (operatingCopy(locale, "checking")) : operatingCopy(locale, "checkAvailability")}</button>
          </div>}
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
                    onClick={resumeDraft}
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
              <details className="optional-report-field" open={!!(draft.latitude || draft.longitude || issues.exactLocation)}>
              <summary>{flowCopy.location}</summary>
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
                    update("latitude", latitude);
                    update("longitude", longitude);
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
              </details>
              {residentUid && !availability?.intakePaused && (
                <details className="optional-report-field">
                <summary>{flowCopy.photos}</summary>
                <EvidencePicker
                  key={draft.idempotencyKey}
                  owner={residentUid}
                  draftKey={draft.idempotencyKey}
                  locale={locale}
                  onAssets={setEvidence}
                  onBlocked={setUploadBlocked}
                />
                </details>
              )}
              {issues.evidence && (
                <p className="field-error">{issues.evidence}</p>
              )}
              {((draft.category && draft.description.trim().length >= 20 && draft.nearbyLandmark.trim().length >= 3) || Object.keys(issues).length > 0 || draft.confirmNonEmergency || draft.confirmPublicSummary) && <section className="submission-confirmations" aria-label={flowCopy.ready}>
              <h2>{flowCopy.ready}</h2>
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
              </section>}
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
                  onClick={reviewDuplicates}
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
                (availability?.intakePaused && !ambiguous && !resumed) ||
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
