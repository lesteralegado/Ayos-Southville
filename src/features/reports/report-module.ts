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
  description: string;
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

function validateSubmission(input: ReportSubmission) {
  const issues: Record<string, string> = {};
  if (!reportCategories.includes(input.category)) issues.category = "Choose a supported report category.";
  if (input.idempotencyKey.trim().length < 12) issues.idempotencyKey = "Start a fresh submission and try again.";
  if (input.description.trim().length < 20) issues.description = "Describe the concern in at least 20 characters.";
  if (input.nearbyLandmark.trim().length < 3) issues.nearbyLandmark = "Add a nearby landmark.";
  if (!input.confirmNonEmergency) issues.confirmNonEmergency = "Confirm that this is not an emergency.";
  if (!input.confirmPublicSummary) issues.confirmPublicSummary = "Confirm that this summary may be public.";
  if (Object.keys(issues).length) throw new ReportValidationError(issues);
}

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
    async submit(input: ReportSubmission) {
      if (input.isEmergency) throw new EmergencyReportError();
      validateSubmission(input);
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
          description: input.description,
          publicArea: input.nearbyLandmark,
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
