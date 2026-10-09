import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getVerifiedResident: vi.fn(),
  submit: vi.fn(),
  listMine: vi.fn(),
}));

vi.mock("@/features/auth/session", () => ({ getVerifiedResident: mocks.getVerifiedResident }));
vi.mock("@/features/reports/firebase-report-store", () => ({
  getReportModule: () => ({ submit: mocks.submit, listMine: mocks.listMine }),
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
  beforeEach(() => vi.clearAllMocks());

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
    mocks.listMine.mockResolvedValue([{ reference: "AS-7K3M2Q", status: "Submitted" }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.listMine).toHaveBeenCalledWith("resident-1");
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
