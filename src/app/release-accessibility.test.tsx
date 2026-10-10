import { render } from "@testing-library/react";
import axe from "axe-core";
import { ReportComposer } from "@/features/reports/report-composer";
import { ReportDetail } from "@/features/reports/report-detail";
import { NotificationCenter } from "@/features/reports/notification-center";
import type { PublicReportDetail } from "@/features/reports/report-module";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const axeOptions = { runOnly: { type: "tag" as const, values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, rules: { "color-contrast": { enabled: false } } };
const guidance = { en: { message: "Call emergency services", phone: "911", sourceUrl: "https://e911.gov.ph" }, fil: { message: "Tumawag sa serbisyong pang-emergency", phone: "911", sourceUrl: "https://e911.gov.ph" } };
const report: PublicReportDetail = { reference: "AS-A11Y", category: "streetlights", status: "Resolved", publicSummary: "Streetlight beside the covered court is working again.", publicArea: "Phase 2", submittedAt: "2026-10-01T00:00:00.000Z", media: [], timeline: [{ status: "Submitted", occurredAt: "2026-10-01T00:00:00.000Z" }, { status: "Resolved", occurredAt: "2026-10-02T00:00:00.000Z", update: { en: "Repair verified.", fil: "Natiyak ang pagkukumpuni." } }] };

async function expectAccessible(container: HTMLElement) { expect((await axe.run(container, axeOptions)).violations).toEqual([]); }

describe("primary journey automated accessibility sweep", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ notifications: [], preferences: { emailEnabled: false, statusUpdates: true, followUpdates: true } }) }))));
  afterEach(() => vi.unstubAllGlobals());
  it("checks report creation", async () => { const { container } = render(<ReportComposer emergencyGuidance={guidance} />); await expectAccessible(container); });
  it("checks status, timeline, evidence, and resident resolution", async () => { const { container } = render(<ReportDetail report={report} />); await expectAccessible(container); });
  it("checks notification loading and preferences", async () => { const { container } = render(<NotificationCenter />); await expectAccessible(container); });
});