// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
const load = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/session", () => ({ getVerifiedOperator: async () => ({ uid: "operator", roles: ["Administrator"] }), hasPilotEligibility: async () => true, getVerifiedResident: async () => ({ uid: "resident" }) }));
vi.mock("@/features/reports/firebase-moderation-store", () => ({ getModerationModule: () => ({ listWorkspacePage: load }) }));
vi.mock("@/features/reports/firebase-report-store", () => ({ getReportModule: async () => ({ listMinePage: load }) }));
vi.mock("@/features/admin/firebase-administration-store", () => ({ getPublicPilotConfiguration: async () => ({ destinations: [] }) }));
import ModerationPage from "@/app/moderation/page";
import MyReportsPage from "@/app/account/reports/page";

it.each([["/moderation", ModerationPage], ["/account/reports", MyReportsPage]] as const)("offers recovery for missing and building indexes on %s", async (href, page) => {
  for (const message of ["9 FAILED_PRECONDITION: The query requires an index.", "9 FAILED_PRECONDITION: The query requires an index. That index is currently building and cannot be used yet."]) {
    load.mockRejectedValueOnce(Object.assign(new Error(message), { code: 9 }));
    const html = renderToStaticMarkup(await page());
    expect(html).toContain("Reports are being prepared");
    expect(html).toContain(`href="${href}"`);
    expect(html).not.toContain("FAILED_PRECONDITION");
    expect(html).not.toContain("No reports");
  }
});
it.each([ModerationPage, MyReportsPage])("preserves unrelated query failures for normal error handling", async page => {
  const error = Object.assign(new Error("Permission denied"), { code: 7 });
  load.mockRejectedValueOnce(error);
  await expect(page()).rejects.toBe(error);
});
