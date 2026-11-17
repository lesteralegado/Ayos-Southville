import { reportStatusLabel, publicTimelineLabel, presentUpdate, reportProgress } from "./report-presentation";
import { resolutionOutcomeUpdate } from "./resolution-copy";

it("simplifies legacy assignment without changing the supplied status", () => {
  expect(reportStatusLabel("Assigned", "en")).toBe("In progress");
  expect(reportStatusLabel("Resident confirmed", "en")).toBe("Resolved");
  expect(publicTimelineLabel({ status: "Under review", update: { en: "The resident reported that the problem remains.", fil: "Iniulat ng residente na nananatili ang problema." } }, "en")).toBe("Still a problem");
});
it("presents three progress steps while retaining actual historical events", () => {
  const matrix = [
    ["Submitted", "Submitted", 0, "Awaiting review"],
    ["Under review", "Submitted", 0, "Published"],
    ["Assigned", "In progress", 1, ""],
    ["In progress", "In progress", 1, ""],
    ["Resolved", "Resolved", 2, "Awaiting your confirmation"],
    ["Resident confirmed", "Resolved", 2, "Confirmed fixed"],
    ["Rejected", "Rejected", null, ""],
    ["Duplicate", "Duplicate", null, ""],
  ] as const;
  for (const [status, label, step, context] of matrix) {
    const progress = reportProgress({ status }, "en", true);
    expect(progress.label).toBe(label);
    expect(progress.step).toBe(step);
    if (context) expect(progress.context).toContain(context);
  }
  expect(publicTimelineLabel({ status: "Under review" }, "en")).toBe("Under review");
  expect(publicTimelineLabel({ status: "Assigned" }, "en")).toBe("Assigned");
  expect(publicTimelineLabel({ status: "Resident confirmed" }, "en")).toBe("Confirmed fixed");
});
it("identifies an available original language rather than pretending to translate it", () => {
  expect(presentUpdate({ en: "Work started.", fil: "" }, "fil")).toEqual({ text: "Work started.", lang: "en", label: "English" });
  expect(presentUpdate({ en: "Work started.", fil: "Nagsimula na." }, "fil")).toEqual({ text: "Nagsimula na.", lang: "fil", label: "Filipino" });
});
it("keeps private waiting reasons contextual and does not complete disputed or terminal reports", () => {
  const report = { status: "Under review" as const, removalRequestedAt: "2026-11-17T02:00:00Z", history: [{ action: "resident-disputed", status: "Under review" as const, occurredAt: "2026-11-17T01:00:00Z", update: resolutionOutcomeUpdate.dispute }], clarifications: [{ id: "question", question: "Private question", actorUid: "operator", occurredAt: "2026-11-17T01:30:00Z", revision: 1 }] };
  expect(reportProgress(report, "en", true)).toEqual({ label: "Submitted", step: 0, context: ["Published", "Still a problem · Under review", "More information needed", "Archive requested"] });
  expect(reportProgress({ ...report, timeline: report.history }, "en").context).toEqual(["Published", "Still a problem · Under review"]);
  expect(reportProgress({ ...report, archivedAt: "2026-11-17T03:00:00Z" }, "en", true)).toEqual({ label: "Archived", step: null, context: [] });
  expect(reportProgress({ ...report, status: "Rejected", history: [{ action: "rejected:out-of-scope", occurredAt: "2026-11-17T02:00:00Z", reason: "Outside pilot scope" }] }, "en", true)).toMatchObject({ step: null, context: ["Archive requested", "Outside pilot scope"] });
  const answered = { ...report, clarifications: [{ ...report.clarifications[0], response: { explanation: "Private response", actorUid: "resident", occurredAt: "2026-11-17T02:00:00Z" } }] };
  expect(reportProgress(answered, "fil", true).context).toContain("Naghihintay ng pagsusuri ng operator ang iyong sagot.");
  expect(reportProgress({ status: "Resolved" }, "fil", true).context).toEqual(["Naghihintay ng iyong kumpirmasyon"]);
  expect(reportProgress({ status: "Resolved" }, "en").context).toEqual(["Awaiting resident confirmation"]);
});
it("keeps a continued concern visible through review coordination events", () => {
  const history = [
    { action: "resolved", status: "Resolved" as const, occurredAt: "2026-11-17T00:00:00Z" },
    { action: "resident-disputed", status: "Under review" as const, occurredAt: "2026-11-17T01:00:00Z", update: resolutionOutcomeUpdate.dispute },
    { action: "review-takeover", status: "Under review" as const, occurredAt: "2026-11-17T02:00:00Z", update: { en: "Backup review accepted", fil: "Tinanggap ang pagsusuri" } },
  ];
  expect(reportProgress({ status: "Under review", history }, "en", true).context).toContain("Still a problem · Under review");
  expect(reportProgress({ status: "Under review", timeline: history }, "en").context).toContain("Still a problem · Under review");
  expect(reportProgress({ status: "In progress", history }, "en", true).context).not.toContain("Still a problem · Under review");
});
