import { render } from "@testing-library/react";
import { expectAccessible } from "@/test/accessibility";
import { ReportComposer } from "@/features/reports/report-composer";
import { ReportDetail } from "@/features/reports/report-detail";
import { NotificationCenter } from "@/features/reports/notification-center";
import type { PublicReportDetail } from "@/features/reports/report-module";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const guidance = { en: { message: "Call emergency services", phone: "911", sourceUrl: "https://e911.gov.ph" }, fil: { message: "Tumawag sa serbisyong pang-emergency", phone: "911", sourceUrl: "https://e911.gov.ph" } };
const report: PublicReportDetail = { reference: "AS-A11Y", category: "streetlights", status: "Resolved", publicSummary: "Streetlight beside the covered court is working again.", publicArea: "Phase 2", submittedAt: "2026-10-01T00:00:00.000Z", media: [], timeline: [{ status: "Submitted", occurredAt: "2026-10-01T00:00:00.000Z" }, { status: "Resolved", occurredAt: "2026-10-02T00:00:00.000Z", update: { en: "Repair verified.", fil: "Natiyak ang pagkukumpuni." } }] };


describe("primary journey automated accessibility sweep", () => {
  const errors = vi.spyOn(console, "error");
  beforeEach(() => vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ notifications: [], preferences: { emailEnabled: false, statusUpdates: true, followUpdates: true } }) }))));
  afterEach(() => { vi.unstubAllGlobals(); expect(errors.mock.calls).toEqual([]); errors.mockClear(); });
  it("checks report creation", async () => { const { container } = render(<ReportComposer emergencyGuidance={guidance} />); await expectAccessible(container); });
  it("checks status, timeline, evidence, and resident resolution", async () => { const { container } = render(<ReportDetail report={report} />); await expectAccessible(container); });
  it("checks notification loading and preferences", async () => { const { container } = render(<NotificationCenter />); await expectAccessible(container); });
});
