export const reportCategories = ["roads-drainage", "streetlights", "waste-collection"] as const;

export type ReportCategory = (typeof reportCategories)[number];
export type ReportStatus = "Submitted";

export type ReportSubmission = {
  residentUid: string;
  idempotencyKey: string;
  category: ReportCategory;
  description: string;
  nearbyLandmark: string;
  isEmergency: boolean;
  confirmNonEmergency: boolean;
  confirmPublicSummary: boolean;
};

export type ResidentReport = {
  reference: string;
  reporterUid: string;
  category: ReportCategory;
  description: string;
  nearbyLandmark: string;
  status: ReportStatus;
  submittedAt: string;
};

export type PublicReportDetail = {
  reference: string;
  category: ReportCategory;
  publicSummary: string;
  publicArea: string;
  status: ReportStatus;
  submittedAt: string;
  timeline: Array<{ status: ReportStatus; occurredAt: string }>;
};

export type StoredReport = { private: ResidentReport; public: PublicReportDetail };

export type ReportStore = {
  submitOnce(key: string, report: StoredReport): Promise<{ reference: string; created: boolean }>;
  listByResident(residentUid: string): Promise<ResidentReport[]>;
  getPublic(reference: string): Promise<PublicReportDetail | null>;
};

export class ReportValidationError extends Error {
  readonly code = "VALIDATION";

  constructor(readonly issues: Record<string, string>) {
    super("The report is incomplete.");
  }
}

export class EmergencyReportError extends Error {
  readonly code = "EMERGENCY";

  constructor() {
    super("Potential emergencies cannot enter the community report queue.");
  }
}

function parseSubmission(value: unknown): ReportSubmission {
  const input = typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const issues: Record<string, string> = {};
  const residentUid = typeof input.residentUid === "string" ? input.residentUid.trim() : "";
  const idempotencyKey = typeof input.idempotencyKey === "string" ? input.idempotencyKey.trim() : "";
  const category = typeof input.category === "string" && reportCategories.includes(input.category as ReportCategory) ? input.category as ReportCategory : null;
  const description = typeof input.description === "string" ? input.description.trim() : "";
  const nearbyLandmark = typeof input.nearbyLandmark === "string" ? input.nearbyLandmark.trim() : "";
  if (!residentUid || residentUid.length > 128) issues.residentUid = "A valid resident account is required.";
  if (idempotencyKey.length < 12 || idempotencyKey.length > 128) issues.idempotencyKey = "Start a fresh submission and try again.";
  if (!category) issues.category = "Choose a supported report category.";
  if (description.length < 20 || description.length > 1000) issues.description = "Use between 20 and 1,000 characters.";
  if (nearbyLandmark.length < 3 || nearbyLandmark.length > 160) issues.nearbyLandmark = "Use between 3 and 160 characters for the landmark.";
  if (input.isEmergency !== false) issues.isEmergency = "Choose whether this is an emergency.";
  if (input.confirmNonEmergency !== true) issues.confirmNonEmergency = "Confirm that this is not an emergency.";
  if (input.confirmPublicSummary !== true) issues.confirmPublicSummary = "Confirm that a safe summary may be public.";
  if (Object.keys(issues).length) throw new ReportValidationError(issues);
  return {
    residentUid,
    idempotencyKey,
    category: category!,
    description,
    nearbyLandmark,
    isEmergency: false,
    confirmNonEmergency: true,
    confirmPublicSummary: true,
  };
}

const publicSummaries: Record<ReportCategory, string> = {
  "roads-drainage": "A roads and drainage concern was submitted for review.",
  streetlights: "A streetlight concern was submitted for review.",
  "waste-collection": "A waste collection concern was submitted for review.",
};

export function createReportModule({
  store,
  now = () => new Date(),
  nextReference = () => `AS-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`,
}: {
  store: ReportStore;
  now?: () => Date;
  nextReference?: () => string;
}) {
  return {
    async submit(value: unknown) {
      if (typeof value === "object" && value !== null && "isEmergency" in value && value.isEmergency === true) {
        throw new EmergencyReportError();
      }
      const input = parseSubmission(value);
      const reference = nextReference();
      const submittedAt = now().toISOString();
      return store.submitOnce(`${input.residentUid}:${input.idempotencyKey}`, {
        private: {
          reference,
          reporterUid: input.residentUid,
          category: input.category,
          description: input.description,
          nearbyLandmark: input.nearbyLandmark,
          status: "Submitted",
          submittedAt,
        },
        public: {
          reference,
          category: input.category,
          publicSummary: publicSummaries[input.category],
          publicArea: "Southville 1 · Location pending review",
          status: "Submitted",
          submittedAt,
          timeline: [{ status: "Submitted", occurredAt: submittedAt }],
        },
      });
    },
    listMine: (residentUid: string) => store.listByResident(residentUid),
    getPublic: (reference: string) => store.getPublic(reference),
  };
}

export function createMemoryReportStore(): ReportStore {
  const receipts = new Map<string, string>();
  const reports = new Map<string, StoredReport>();
  return {
    async submitOnce(key, report) {
      const existingReference = receipts.get(key);
      if (existingReference) return { reference: existingReference, created: false };
      receipts.set(key, report.private.reference);
      reports.set(report.private.reference, report);
      return { reference: report.private.reference, created: true };
    },
    async listByResident(residentUid) {
      return [...reports.values()].map((report) => report.private).filter((report) => report.reporterUid === residentUid);
    },
    async getPublic(reference) {
      return reports.get(reference)?.public ?? null;
    },
  };
}
