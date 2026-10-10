export type PilotSession = {
  participantCode: string;
  submitted: boolean;
  assisted: boolean;
  understoodStatus: boolean;
  foundDuplicate: boolean;
  completedLifecycle: boolean;
};

export type DemoReport = {
  reference: string;
  category: string;
  status: "Submitted" | "Under review" | "Assigned" | "In progress" | "Resolved" | "Resident confirmed";
  publicArea: string;
  evidence: Array<{ name: string; visibility: "restricted" | "public" }>;
};

type PilotFixture = {
  mode: "demonstration";
  participants: Array<{ code: string; role: "Resident" | "Moderator" | "Coordinator" | "Administrator" }>;
  reports: DemoReport[];
  sessions: PilotSession[];
};

const percentage = (value: number, total: number) => total === 0 ? 0 : Math.round(value / total * 100);

export function createPilotRelease(fixture: PilotFixture) {
  const sessions = fixture.sessions;
  return {
    ...fixture,
    disclosure: {
      en: "Demonstration data only. Ayos Southville is a resident-led pilot, not an official government or homeowners’ association service.",
      fil: "Demonstration data lamang. Ang Ayos Southville ay pilot ng mga residente at hindi opisyal na serbisyo ng pamahalaan o homeowners’ association.",
    },
    analytics: {
      totalReports: fixture.reports.length,
      byStatus: Object.fromEntries(fixture.reports.map(({ status }) => [status, fixture.reports.filter((report) => report.status === status).length])),
    },
    measurement: {
      participants: sessions.length,
      submissions: sessions.filter(({ submitted }) => submitted).length,
      unassistedSubmissionRate: percentage(sessions.filter(({ submitted, assisted }) => submitted && !assisted).length, sessions.length),
      statusComprehensionRate: percentage(sessions.filter(({ understoodStatus }) => understoodStatus).length, sessions.length),
      duplicateDiscoveryRate: percentage(sessions.filter(({ foundDuplicate }) => foundDuplicate).length, sessions.length),
      lifecycleCompletionRate: percentage(sessions.filter(({ completedLifecycle }) => completedLifecycle).length, sessions.length),
    },
  };
}

const statuses: DemoReport["status"][] = ["Submitted", "Under review", "Assigned", "In progress", "Resolved", "Resident confirmed"];
export const demoPilotFixture: PilotFixture = {
  mode: "demonstration",
  participants: Array.from({ length: 10 }, (_, index) => ({ code: `P${String(index + 1).padStart(2, "0")}`, role: index === 9 ? "Administrator" : index === 8 ? "Coordinator" : index === 7 ? "Moderator" : "Resident" })),
  reports: statuses.map((status, index) => ({ reference: `DEMO-${String(index + 1).padStart(3, "0")}`, category: ["roads-drainage", "streetlights", "waste-collection"][index % 3], status, publicArea: `Phase ${(index % 3) + 1}`, evidence: index % 2 ? [{ name: `evidence-${index}.jpg`, visibility: status === "Submitted" ? "restricted" : "public" }] : [] })),
  sessions: [],
};
export function createRepresentativePilotFixture(reportCount = 100): PilotFixture {
  return {
    ...demoPilotFixture,
    reports: Array.from({ length: reportCount }, (_, index) => ({
      reference: `LOAD-${String(index + 1).padStart(4, "0")}`,
      category: ["roads-drainage", "streetlights", "waste-collection"][index % 3],
      status: statuses[index % statuses.length],
      publicArea: `Phase ${(index % 5) + 1}`,
      evidence: index < 25 ? [{ name: `load-evidence-${index + 1}.jpg`, visibility: index % 2 ? "public" : "restricted" }] : [],
    })),
  };
}