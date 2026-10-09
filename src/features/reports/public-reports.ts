export type PublicReport = {
  id: string;
  title: string;
  category: "Roads & drainage" | "Streetlights" | "Waste collection";
  publicArea: string;
  status: "Under review" | "Assigned" | "In progress";
  summary: string;
  reportedAt: string;
  affectedResidents: number;
};

type SeedReport = PublicReport & {
  reporterEmail: string;
  exactAddress: string;
  internalNotes: string;
};

const seedReports: SeedReport[] = [
  {
    id: "AS-1042",
    title: "Blocked drainage after heavy rain",
    category: "Roads & drainage",
    publicArea: "Phase 2 · Covered court area",
    status: "In progress",
    summary: "Standing water remains along the walkway after rainfall.",
    reportedAt: "2026-10-08T08:10:00+08:00",
    affectedResidents: 14,
    reporterEmail: "reporter@example.com",
    exactAddress: "Block 11, Lot 4",
    internalNotes: "Call the reporter before visiting.",
  },
  {
    id: "AS-1038",
    title: "Streetlight stays off at night",
    category: "Streetlights",
    publicArea: "Phase 1 · Main road",
    status: "Assigned",
    summary: "The light near the pedestrian crossing has been dark for three nights.",
    reportedAt: "2026-10-07T19:35:00+08:00",
    affectedResidents: 9,
    reporterEmail: "private@example.com",
    exactAddress: "Block 3, Lot 18",
    internalNotes: "Possible wiring issue.",
  },
  {
    id: "AS-1031",
    title: "Missed waste collection",
    category: "Waste collection",
    publicArea: "Phase 3 · East entrance",
    status: "Under review",
    summary: "Several collection points were missed during the regular route.",
    reportedAt: "2026-10-06T17:20:00+08:00",
    affectedResidents: 6,
    reporterEmail: "hidden@example.com",
    exactAddress: "Block 20, Lot 2",
    internalNotes: "Confirm schedule with coordinator.",
  },
];

export function listPublicReports(): PublicReport[] {
  return seedReports.map(
    ({
      id,
      title,
      category,
      publicArea,
      status,
      summary,
      reportedAt,
      affectedResidents,
    }) => ({
      id,
      title,
      category,
      publicArea,
      status,
      summary,
      reportedAt,
      affectedResidents,
    }),
  );
}
