// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({ records: new Map<string, Record<string, unknown>>(), unavailable: false }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/firebase/admin", () => {
  const snapshot = (key: string) => ({ id: key.split("/").at(-1), exists: fixture.records.has(key), data: () => fixture.records.get(key) });
  return { getFirebaseAdmin: () => ({ db: { collection(name: string) {
    return { doc: (id: string) => ({ get: async () => snapshot(`${name}/${id}`) }),
      where: (field: string, _operator: string, value: unknown) => ({ limit: (limit: number) => ({ get: async () => {
        if (fixture.unavailable) throw new Error("Sensitive Firebase credential details");
        return { docs: [...fixture.records].filter(([key, data]) => key.startsWith(`${name}/`) && data[field] === value).slice(0, limit).map(([key]) => snapshot(key)) };
      } }) }),
    };
  } } }) };
});
import { GET as discovery } from "@/app/api/public-reports/route";
import { GET as insights } from "@/app/api/insights/route";
import { getPublicCanonicalReference } from "./firebase-discovery";
import { getReportModule } from "./firebase-report-store";
const accepted = { approved: true, category: "streetlights", status: "Resolved", publicSummary: "Approved concern", publicArea: "Public court",
  submittedAt: "2026-10-10T00:00:00Z", media: [{ id: "a".repeat(64), alt: "Reviewed broken light", privateStoragePath: "secret" }],
  reporterEmail: "private@example.invalid", timeline: [{ status: "Resolved", occurredAt: "2026-10-10T02:00:00Z", reason: "private reason", update: { en: "Repaired", fil: "Naayos", operatorUid: "secret" } }] };
beforeEach(() => { fixture.records.clear(); fixture.unavailable = false; vi.stubEnv("DEMO_MODE", "false"); });
afterEach(() => vi.unstubAllEnvs());

it("serves the same approved projection through Firebase discovery, detail, and accurate insights", async () => {
  fixture.records.set("publicReports/AS-ABC123", accepted);
  fixture.records.set("publicReports/AS-DEF123", { ...accepted, status: "Rejected" });
  fixture.records.set("publicReports/AS-GHI123", { ...accepted, approved: false });
  fixture.records.set("publicReports/DEMO-001", { ...accepted, demonstration: true });
  fixture.records.set("pilotConfiguration/current", { categories: [{ id: "streetlights", active: true, label: { en: "Configured lighting", fil: "Nasuring ilaw" }, destinationId: "private-routing" }] });
  const response = await discovery(new Request("https://example.test/api/public-reports?view=map"));
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  const body = await response.json();
  expect(body.total).toBe(1);
  expect(body.reports[0]).toEqual(await (await getReportModule()).getPublic("AS-ABC123"));
  expect(body.categories[0].label.en).toBe("Configured lighting");
  expect(JSON.stringify(body)).not.toMatch(/private@example|privateStoragePath|reason|operatorUid|private-routing|Rejected|DEMO-/);
  const aggregate = await (await insights()).json();
  expect(aggregate.insights.totals.all).toBe(1);
  expect(aggregate.insights.medianResolutionHours).toBe(2);
  expect(aggregate.insights.recurringAreas).toEqual([]);
});
it("returns bounded public errors without credentials, partial counts, or demo fallback", async () => {
  fixture.unavailable = true;
  const failure = await discovery(new Request("https://example.test/api/public-reports"));
  expect(failure.status).toBe(503);
  expect(await failure.json()).toEqual({ code: "UNAVAILABLE" });
  fixture.unavailable = false;
  const invalid = await discovery(new Request("https://example.test/api/public-reports?date=bad"));
  expect(invalid.status).toBe(422);
  for (let i = 0; i < 501; i++) fixture.records.set(`publicReports/AS-${i}`, accepted);
  expect((await discovery(new Request("https://example.test/api/public-reports"))).status).toBe(503);
  expect((await insights()).status).toBe(503);
});
it("requires server demo mode, uses a separate collection, and refuses production demo mode", async () => {
  fixture.records.set("publicReports/AS-ABC123", accepted);
  fixture.records.set("demoPublicReports/DEMO-001", { ...accepted, demonstration: true });
  expect((await (await discovery(new Request("https://example.test/api/public-reports?demo=true"))).json()).mode).toBe("live");
  vi.stubEnv("DEMO_MODE", "true");
  const demo = await (await discovery(new Request("https://example.test/api/public-reports"))).json();
  expect(demo.mode).toBe("demo"); expect(demo.reports.map((report: { reference: string }) => report.reference)).toEqual(["DEMO-001"]);
  vi.stubEnv("VERCEL_ENV", "production");
  expect((await discovery(new Request("https://example.test/api/public-reports"))).status).toBe(503);
});
it("redirects duplicates only to a currently approved canonical report and terminates cycles", async () => {
  fixture.records.set("privateReports/AS-OLD123", { status: "Duplicate", canonicalReference: "AS-ABC123", reporterUid: "private identity" });
  fixture.records.set("publicReports/AS-ABC123", accepted);
  expect(await getPublicCanonicalReference("AS-OLD123")).toBe("AS-ABC123");
  fixture.records.delete("publicReports/AS-ABC123");
  expect(await getPublicCanonicalReference("AS-OLD123")).toBeNull();
  fixture.records.set("privateReports/AS-ABC123", { status: "Duplicate", canonicalReference: "AS-OLD123" });
  expect(await getPublicCanonicalReference("AS-OLD123")).toBeNull();
});
