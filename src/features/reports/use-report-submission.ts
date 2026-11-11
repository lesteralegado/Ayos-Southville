"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { operatingCopy } from "@/features/i18n/operating-copy";
import type { PilotOperations } from "@/features/admin/pilot-operations";
import type { EvidenceAsset } from "./report-module";
import type { DuplicateSuggestion } from "./engagement-module";
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

/** Owns private drafts and authoritative submission/recovery; presentation observes one phase. */
export function useReportSubmission({ residentUid, categories, operatingStatus, locale }: {
  residentUid?: string;
  categories: readonly { id: string }[];
  operatingStatus?: Pick<PilotOperations, "intakePaused" | "explanation" | "resumesAt">;
  locale: "en" | "fil";
}) {
  const fil = locale === "fil";
  const networkError = fil
    ? "Hindi makumpirma ang submission. Huwag baguhin ang draft; subukan muli upang mabawi ang parehong receipt nang walang duplicate."
    : "We could not confirm the submission. Keep this draft unchanged and retry to recover the same receipt without creating a duplicate.";
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
  const [phase, setPhase] = useState<"editing" | "pending" | "ambiguous" | "refused" | "confirmed">("editing");
  const pending = phase === "pending";
  const ambiguous = phase === "ambiguous";
  const [reference, setReference] = useState<string>();
  const submitting = useRef(false);
  const [availability, setAvailability] = useState(operatingStatus);
  const [availabilityConfirmed, setAvailabilityConfirmed] = useState(!!operatingStatus);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceAsset[]>([]);
  const [uploadBlocked, setUploadBlocked] = useState(false);
  const [suggestions, setSuggestions] = useState<DuplicateSuggestion[]>([]);
  const [duplicatesReviewed, setDuplicatesReviewed] = useState(false);
  async function refreshAvailability() {
    setCheckingAvailability(true);
    try {
      const response = await fetch("/api/pilot-status", { cache: "no-store" });
      if (!response.ok) throw new Error("Unavailable");
      setAvailability(await response.json());
      setAvailabilityConfirmed(true);
      setSubmitError("");
    } catch {
      setSubmitError(operatingCopy(locale, "availabilityCouldNotBeConfirmedYourDraftRemains"));
    } finally { setCheckingAvailability(false); }
  }
  useEffect(() => {
    if (!draft.category && !draft.description && !draft.nearbyLandmark) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      queueMicrotask(() => setStorageError(true));
    }
  }, [draft, storageKey]);

  function update<Key extends keyof Draft>(key: Key, value: Draft[Key]) {
    if (submitting.current || pending || ambiguous || phase === "confirmed") return;
    setDraft((current) => ({ ...current, [key]: value }));
    if (["category", "latitude", "longitude"].includes(key)) {
      setDuplicatesReviewed(false);
      setSuggestions([]);
    }
  }
  function clearDraft(key = draft.idempotencyKey) {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* Receipt is authoritative even without device storage. */
    }
    window.dispatchEvent(new Event(draftEvent));
    if (residentUid)
      void clearLocalPhotos(residentUid, key).catch(
        () => undefined,
      );
  }
  function discardDraft() {
    if (submitting.current || pending || ambiguous || phase === "confirmed") return;
    clearDraft(savedDraft?.idempotencyKey ?? draft.idempotencyKey);
    setDraft(blankDraft());
    setIssues({});
    setSubmitError("");
    setResumed(false);
    setEvidence([]);
    setUploadBlocked(false);
    setPhase("editing");
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
  async function submit() {
    if (submitting.current || phase === "confirmed") return;
    submitting.current = true;
    try {
      if (residentUid && (ambiguous || resumed)) {
        setPhase("pending");
        try {
          const response = await fetch(
            `/api/reports/receipt?draftKey=${encodeURIComponent(draft.idempotencyKey)}`,
            { cache: "no-store" },
          );
          if (response.ok) {
            const receipt = (await response.json()) as { reference: string };
            if (typeof receipt.reference !== "string" || !/^AS-[A-Z0-9]+$/.test(receipt.reference))
              throw new Error("Receipt unconfirmed");
            clearDraft();
            setReference(receipt.reference);
            setPhase("confirmed");
            return;
          }
          if (response.status !== 404) throw new Error("Receipt unconfirmed");
        } catch {
          setPhase("ambiguous");
          setSubmitError(networkError);
          return;
        } finally {
          setPhase(current => current === "pending" ? "editing" : current);
        }
      }
      if (uploadBlocked && !ambiguous) return;
      const next = validate();
      if (ambiguous) delete next.category;
      setIssues(next);
      setSubmitError("");
      if (draft.isEmergency || Object.keys(next).length) {
        setPhase("refused");
        return;
      }
      setPhase("pending");
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
          code?: string;
        };
        if (result.code === "INTAKE_PAUSED") {
          setAvailability({ intakePaused: true, explanation: { en: "", fil: "" }, resumesAt: "" });
          setAvailabilityConfirmed(false);
          setSubmitError("");
          await refreshAvailability();
          setPhase("refused");
          return;
        }
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
          setPhase("refused");
          return;
        }
        if (response.status === 401 || response.status === 403) {
          setPhase("refused");
          setSubmitError(
            fil
              ? "Mag-sign in muli at tiyaking aprubado ang pilot access. Nananatili ang draft."
              : "Sign in again and confirm pilot approval. Your draft remains.",
          );
          return;
        }
        if (!response.ok || typeof result.reference !== "string" || !/^AS-[A-Z0-9]+$/.test(result.reference))
          throw new Error("Submission unconfirmed");
        clearDraft();
        setReference(result.reference);
        setPhase("confirmed");
      } catch {
        setPhase(submissionStarted ? "ambiguous" : "refused");
        setSubmitError(
          submissionStarted
            ? networkError
            : fil
              ? "Hindi available ang duplicate check. Nananatili ang draft; kumonekta at subukan muli."
              : "Duplicate checking is unavailable. Your draft remains; reconnect and retry.",
        );
      } finally {
        setPhase(current => current === "pending" ? "editing" : current);
      }
    } finally {
      submitting.current = false;
    }
  }
  async function supportSuggestion(reference: string) {
    if (submitting.current || pending || ambiguous || phase === "confirmed") return;
    submitting.current = true;
    setPhase("pending");
    try {
      const response = await fetch(`/api/reports/${reference}/engagement`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "affected", active: true }),
      });
      if (!response.ok) throw new Error("Support unconfirmed");
      clearDraft();
      setReference(reference);
      setPhase("confirmed");
    } catch {
      setPhase("refused");
      setSubmitError(
        fil
          ? "Hindi makumpirma ang update. Ligtas ang draft; subukan muli."
          : "The update could not be confirmed. Your draft remains; retry.",
      );
    } finally {
      submitting.current = false;
      setPhase(current => current === "pending" ? "editing" : current);
    }
  }

  function resumeDraft() {
    if (!savedDraft || submitting.current || pending || ambiguous || phase === "confirmed") return;
    setDraft(savedDraft);
    setResumed(true);
    setPhase("editing");
    setIssues({});
    setSubmitError("");
    setDuplicatesReviewed(false);
    setSuggestions([]);
  }
  function reviewDuplicates() {
    if (submitting.current || pending || ambiguous || phase === "confirmed") return;
    setDuplicatesReviewed(true);
    setSuggestions([]);
  }
  return {
    phase, reference, draft, savedDraft, issues, submitError, pending, ambiguous, resumed,
    availability, availabilityConfirmed, checkingAvailability, storageError,
    suggestions, duplicatesReviewed, uploadBlocked,
    update, resumeDraft, discardDraft, submit, supportSuggestion, refreshAvailability, reviewDuplicates,
    setEvidence, setUploadBlocked,
  };
}

