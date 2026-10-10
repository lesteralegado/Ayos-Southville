import { vi } from "vitest";
const mocks = vi.hoisted(() => ({ resident: vi.fn(), receipt: vi.fn() }));
vi.mock("@/features/auth/session", () => ({
  getVerifiedResident: mocks.resident,
}));
vi.mock("@/features/reports/firebase-report-store", () => ({
  getReportReceipt: mocks.receipt,
}));
import { GET } from "./route";
it("recovers only the authenticated resident receipt without category or pilot configuration dependencies", async () => {
  mocks.resident.mockResolvedValue({ uid: "r1" });
  mocks.receipt.mockResolvedValue({ reference: "AS-ORIGINAL", created: false });
  const response = await GET(
    new Request(
      "https://ayos.test/api/reports/receipt?draftKey=disabled-category-retry",
    ),
  );
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(mocks.receipt).toHaveBeenCalledWith("r1", "disabled-category-retry");
  expect(await response.json()).toEqual({
    reference: "AS-ORIGINAL",
    created: false,
  });
});
