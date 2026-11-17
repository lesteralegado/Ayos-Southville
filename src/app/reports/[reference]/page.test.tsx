import { vi } from "vitest";
const fixture = vi.hoisted(() => ({ published: false, owned: false, signedIn: true, canonical: "AS-CANONICAL" as string | null }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error("redirect:" + url); }, notFound: () => { throw new Error("not-found"); } }));
vi.mock("@/features/auth/session", () => ({ getVerifiedResident: async () => fixture.signedIn ? { uid: "resident" } : null, hasPilotAccess: async () => true }));
vi.mock("@/features/reports/firebase-discovery", () => ({ getPublicCanonicalReference: async () => fixture.canonical, discoveryMode: () => "live", getDiscoveryCategories: async () => [] }));
vi.mock("@/features/reports/firebase-report-store", () => ({ getReportModule: async () => ({ getPublic: async () => fixture.published ? { reference: "AS-PUBLISHED", status: "Resolved", category: "streetlights" } : null, getMine: async () => fixture.owned ? { reference: "AS-DUPLICATE", category: "streetlights", description: "Original private concern", nearbyLandmark: "Court", status: "Duplicate", submittedAt: "2026-11-17T00:00:00Z", canonicalReference: "AS-CANONICAL", history: [], evidence: [] } : null }) }));
import ReportPage from "./page";
beforeEach(() => { fixture.published = false; fixture.owned = false; fixture.signedIn = true; fixture.canonical = "AS-CANONICAL"; });
it("keeps the owner on the private duplicate receipt while preserving the public canonical redirect", async () => {
  fixture.owned = true;
  const page = await ReportPage({ params: Promise.resolve({ reference: "AS-DUPLICATE" }) });
  expect(page.props.privateReceipt).toBe(true);
  expect(page.props.ownedReport.canonicalReference).toBe("AS-CANONICAL");
  fixture.owned = false;
  await expect(ReportPage({ params: Promise.resolve({ reference: "AS-DUPLICATE" }) })).rejects.toThrow("redirect:/reports/AS-CANONICAL");
});
it("returns a signed-out notification recipient to the exact report after sign-in", async () => {
  fixture.signedIn = false; fixture.canonical = null;
  await expect(ReportPage({ params: Promise.resolve({ reference: "AS-PRIVATE" }), searchParams: Promise.resolve({ from: "notification" }) })).rejects.toThrow("redirect:/sign-in?next=%2Freports%2FAS-PRIVATE%3Ffrom%3Dnotification");
});
it("offers recovery for a missing or unauthorized notification target without restoring private records", async () => {
  fixture.canonical = null;
  const result = await ReportPage({ params: Promise.resolve({ reference: "AS-DELETED" }), searchParams: Promise.resolve({ from: "notification" }) });
  expect(result.props.reference).toBe("AS-DELETED");
  expect(result.props).not.toHaveProperty("ownedReport");
});

it.each([false, true])("authenticates notification targets before canonical redirects or public details (published=%s)", async published => {
  fixture.signedIn = false; fixture.published = published;
  await expect(ReportPage({ params: Promise.resolve({ reference: "AS-TARGET" }), searchParams: Promise.resolve({ from: "notification" }) })).rejects.toThrow("redirect:/sign-in?next=%2Freports%2FAS-TARGET%3Ffrom%3Dnotification");
});
