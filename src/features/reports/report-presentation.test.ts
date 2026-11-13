import { reportStatusLabel, publicTimelineLabel, presentUpdate } from "./report-presentation";

it("simplifies legacy assignment without changing the supplied status", () => {
  expect(reportStatusLabel("Assigned", "en")).toBe("In progress");
  expect(reportStatusLabel("Resident confirmed", "en")).toBe("Confirmed fixed");
  expect(publicTimelineLabel({ status: "Under review", update: { en: "The resident reported that the problem remains.", fil: "Iniulat ng residente na nananatili ang problema." } }, "en")).toBe("Still a problem");
});
it("identifies an available original language rather than pretending to translate it", () => {
  expect(presentUpdate({ en: "Work started.", fil: "" }, "fil")).toEqual({ text: "Work started.", lang: "en", label: "English" });
  expect(presentUpdate({ en: "Work started.", fil: "Nagsimula na." }, "fil")).toEqual({ text: "Nagsimula na.", lang: "fil", label: "Filipino" });
});
