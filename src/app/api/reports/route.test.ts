import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getVerifiedResident: vi.fn(),
  hasPilotAccess: vi.fn(),
  submit: vi.fn(),
  listMinePage: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({ getVerifiedResident: mocks.getVerifiedResident, hasPilotAccess: mocks.hasPilotAccess }));
vi.mock("@/features/reports/firebase-report-store", () => ({
  getReportModule: () => ({ submit: mocks.submit, listMinePage: mocks.listMinePage }),
}));

import { GET, POST } from "./route";

function postRequest(body: unknown) {
  return new Request("https://ayos.test/api/reports", {
    method: "POST",
    headers: { origin: "https://ayos.test", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("resident report application boundary", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.hasPilotAccess.mockResolvedValue(true); });

  it("denies a verified but unapproved resident directly at submission", async () => {
    mocks.getVerifiedResident.mockResolvedValue({ uid: "unapproved" });
    mocks.hasPilotAccess.mockResolvedValue(false);
    const response = await POST(postRequest({ category: "streetlights" }));
    expect(response.status).toBe(403);
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("submits with the authenticated resident identity and returns a stable receipt", async () => {
    mocks.getVerifiedResident.mockResolvedValue({ uid: "resident-1" });
    mocks.submit.mockResolvedValue({ reference: "AS-7K3M2Q", created: true });

    const response = await POST(postRequest({
      residentUid: "attacker-controlled",
      idempotencyKey: "submission-key-1234",
      category: "streetlights",
      description: "The streetlight beside the covered court no longer turns on at night.",
      nearbyLandmark: "Phase 2 covered court",
      isEmergency: false,
      confirmNonEmergency: true,
      confirmPublicSummary: true,
    }));

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ reference: "AS-7K3M2Q", created: true });
    expect(mocks.submit).toHaveBeenCalledWith(expect.objectContaining({ residentUid: "resident-1" }));
  });

  it("rejects unauthenticated submissions before invoking the report module", async () => {
    mocks.getVerifiedResident.mockResolvedValue(null);

    const response = await POST(postRequest({}));

    expect(response.status).toBe(401);
    expect(mocks.submit).not.toHaveBeenCalled();
  });

  it("lists only reports belonging to the authenticated resident", async () => {
    mocks.getVerifiedResident.mockResolvedValue({ uid: "resident-1" });
    mocks.listMinePage.mockResolvedValue({ reports: [{ reference: "AS-7K3M2Q", status: "Submitted" }], nextCursor: "continuation" });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reports: [{ reference: "AS-7K3M2Q", status: "Submitted" }], nextCursor: "continuation" });
    expect(mocks.listMinePage).toHaveBeenCalledWith("resident-1", null);
  });

  it("returns field issues from the report module without creating a receipt", async () => {
    const { ReportValidationError } = await import("@/features/reports/report-module");
    mocks.getVerifiedResident.mockResolvedValue({ uid: "resident-1" });
    mocks.submit.mockRejectedValue(new ReportValidationError({ description: "Use at least 20 characters." }));

    const response = await POST(postRequest({ description: "short" }));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({ code: "VALIDATION", issues: { description: expect.any(String) } });
  });
});
