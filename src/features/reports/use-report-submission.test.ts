import { act, renderHook, waitFor } from "@testing-library/react";
import { useReportSubmission } from "./use-report-submission";

const validDraft = {
  version: 1 as const, idempotencyKey: "saved-draft-identity-1234", category: "streetlights",
  description: "The streetlight near the covered court no longer works.", nearbyLandmark: "Covered court",
  latitude: "", longitude: "", privateLocationDetails: "", isEmergency: false,
  confirmNonEmergency: true, confirmPublicSummary: true,
};

describe("resident submission workflow", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("recovers an authoritative receipt before validating a retired category or blocked photos", async () => {
    localStorage.setItem("ayos-report-draft-v1:r1", JSON.stringify(validDraft));
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ reference: "AS-ORIGINAL" })));
    const { result } = renderHook(() => useReportSubmission({ residentUid: "r1", categories: [], locale: "en" }));
    act(() => result.current.resumeDraft());
    act(() => result.current.setUploadBlocked(true));
    await act(async () => result.current.submit());
    expect(result.current.phase).toBe("confirmed");
    expect(result.current.reference).toBe("AS-ORIGINAL");
    expect(localStorage.getItem("ayos-report-draft-v1:r1")).toBeNull();
  });

  it("retains the saved draft when a successful receipt response has no reference", async () => {
    localStorage.setItem("ayos-report-draft-v1:r1", JSON.stringify(validDraft));
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));
    const { result } = renderHook(() => useReportSubmission({ residentUid: "r1", categories: [], locale: "en" }));
    act(() => result.current.resumeDraft());
    await act(async () => result.current.submit());
    expect(result.current.phase).toBe("ambiguous");
    expect(result.current.reference).toBeUndefined();
    expect(JSON.parse(localStorage.getItem("ayos-report-draft-v1:r1")!).idempotencyKey).toBe(validDraft.idempotencyKey);
  });

  it("keeps the submission immutable and prevents repeated sends before React rerenders", async () => {
    let complete!: (response: Response) => void;
    const request = vi.fn(() => new Promise<Response>(resolve => { complete = resolve; }));
    vi.stubGlobal("fetch", request);
    const { result } = renderHook(() => useReportSubmission({ categories: [{ id: "streetlights" }], locale: "en" }));
    act(() => {
      for (const field of ["category", "description", "nearbyLandmark", "confirmNonEmergency", "confirmPublicSummary"] as const)
        result.current.update(field, validDraft[field]);
    });
    let submission!: Promise<void>;
    act(() => {
      submission = result.current.submit();
      result.current.update("description", "A different concern must not replace a pending submission.");
      void result.current.submit();
    });
    expect(result.current.phase).toBe("pending");
    expect(result.current.draft.description).toBe(validDraft.description);
    expect(request).toHaveBeenCalledTimes(1);
    await act(async () => { complete(Response.json({ reference: "AS-CONFIRMED" })); await submission; });
    expect(result.current.phase).toBe("confirmed");
  });

  it("recovers a lost submission response with the same draft and confirmed photos", async () => {
    localStorage.setItem("ayos-report-draft-v1:r1", JSON.stringify(validDraft));
    const photo = { id: "a".repeat(64), name: "light.jpg", type: "image/jpeg" as const, size: 1200, visibility: "restricted" as const };
    const stored: Array<{ idempotencyKey: string; evidence: unknown[] }> = [];
    let committed = false;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith("/api/reports/receipt"))
        return committed ? Response.json({ reference: "AS-RECOVERED" }) : Response.json({}, { status: 404 });
      stored.push(JSON.parse(String(init?.body)));
      committed = true;
      throw new TypeError("Response lost after commit");
    }));
    const { result } = renderHook(() => useReportSubmission({ residentUid: "r1", categories: [{ id: "streetlights" }], locale: "en" }));
    act(() => { result.current.resumeDraft(); result.current.setEvidence([photo]); });
    await act(async () => result.current.submit());
    expect(result.current.phase).toBe("ambiguous");
    act(() => result.current.update("description", "This edit must not replace the uncertain draft."));
    expect(result.current.draft.description).toBe(validDraft.description);
    expect(stored).toEqual([expect.objectContaining({ idempotencyKey: validDraft.idempotencyKey, evidence: [photo] })]);
    await act(async () => result.current.submit());
    expect(result.current.reference).toBe("AS-RECOVERED");
    expect(stored).toHaveLength(1);
    expect(localStorage.getItem("ayos-report-draft-v1:r1")).toBeNull();
  });

  it("reports unavailable device storage while allowing authoritative submission", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ reference: "AS-NOSTORAGE" })));
    const { result } = renderHook(() => useReportSubmission({ categories: [{ id: "streetlights" }], locale: "en" }));
    await act(async () => {
      for (const field of ["category", "description", "nearbyLandmark", "confirmNonEmergency", "confirmPublicSummary"] as const)
        result.current.update(field, validDraft[field]);
    });
    await waitFor(() => expect(result.current.storageError).toBe(true));
    await act(async () => result.current.submit());
    expect(result.current.reference).toBe("AS-NOSTORAGE");
  });

  it("keeps an in-flight pause pending until availability is confirmed without clearing the draft", async () => {
    localStorage.setItem("ayos-report-draft-v1:r1", JSON.stringify(validDraft));
    let confirmAvailability!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.startsWith("/api/reports/receipt")) return Response.json({}, { status: 404 });
      if (url === "/api/pilot-status") return new Promise<Response>(resolve => { confirmAvailability = resolve; });
      return Response.json({ code: "INTAKE_PAUSED" }, { status: 409 });
    }));
    const { result } = renderHook(() => useReportSubmission({ residentUid: "r1", categories: [{ id: "streetlights" }], locale: "en" }));
    act(() => result.current.resumeDraft());
    let submission!: Promise<void>;
    act(() => { submission = result.current.submit(); });
    await waitFor(() => expect(result.current.checkingAvailability).toBe(true));
    expect(result.current.phase).toBe("pending");
    await act(async () => {
      confirmAvailability(Response.json({ intakePaused: true, explanation: { en: "Review coverage is unavailable.", fil: "Walang coverage sa pagsusuri." }, resumesAt: "" }));
      await submission;
    });
    expect(result.current.phase).toBe("refused");
    expect(result.current.availability?.explanation.en).toBe("Review coverage is unavailable.");
    expect(JSON.parse(localStorage.getItem("ayos-report-draft-v1:r1")!).idempotencyKey).toBe(validDraft.idempotencyKey);
    expect(result.current.reference).toBeUndefined();
  });
});
