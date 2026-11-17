import { vi } from "vitest";
const fixture = vi.hoisted(() => ({ owned: false }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error("redirect:" + url); }, notFound: () => { throw new Error("not-found"); } }));
vi.mock("@/features/auth/session", () => ({ getVerifiedResident: async () => ({ uid: "resident" }), hasPilotAccess: async () => true }));
vi.mock("@/features/reports/firebase-discovery", () => ({ getPublicCanonicalReference: async () => "AS-CANONICAL", discoveryMode: () => "live", getDiscoveryCategories: async () => [] }));
vi.mock("@/features/reports/firebase-report-store", () => ({ getReportModule: async () => ({ getPublic: async () => null, getMine: async () => fixture.owned ? { reference: "AS-DUPLICATE", category: "streetlights", description: "Original private concern", nearbyLandmark: "Court", status: "Duplicate", submittedAt: "2026-11-17T00:00:00Z", canonicalReference: "AS-CANONICAL", history: [], evidence: [] } : null }) }));
import ReportPage from "./page";
it("keeps the owner on the private duplicate receipt while preserving the public canonical redirect", async () => {
  fixture.owned = true;
  const page = await ReportPage({ params: Promise.resolve({ reference: "AS-DUPLICATE" }) });
  expect(page.props.privateReceipt).toBe(true);
  expect(page.props.ownedReport.canonicalReference).toBe("AS-CANONICAL");
  fixture.owned = false;
  await expect(ReportPage({ params: Promise.resolve({ reference: "AS-DUPLICATE" }) })).rejects.toThrow("redirect:/reports/AS-CANONICAL");
});
