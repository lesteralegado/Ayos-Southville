export const reportCategories = [
  "roads-drainage",
  "streetlights",
  "waste-collection",
] as const;

export type ReportCategory = string;
export type ReportStatus =
  | "Submitted"
  | "Under review"
  | "Assigned"
  | "In progress"
  | "Resolved"
  | "Resident confirmed"
  | "Rejected"
  | "Duplicate";

export type ReportSubmission = {
  residentUid: string;
  idempotencyKey: string;
  category: ReportCategory;
  description: string;
  nearbyLandmark: string;
  exactLocation?: ExactLocation;
  evidence: EvidenceAsset[];
  isEmergency: boolean;
  confirmNonEmergency: boolean;
  confirmPublicSummary: boolean;
};

export type ExactLocation = {
  latitude: number;
  longitude: number;
  privateDetails: string;
};
export type EvidenceAsset = {
  id: string;
  name: string;
  type: "image/jpeg" | "image/png" | "image/webp";
  size: number;
  visibility: "restricted";
};

export type ResidentReport = {
  reference: string;
  reporterUid: string;
  category: ReportCategory;
  description: string;
  nearbyLandmark: string;
  exactLocation?: ExactLocation;
  evidence: EvidenceAsset[];
  status: ReportStatus;
  submittedAt: string;
};

export type PublicReportDetail = {
  reference: string;
  category: ReportCategory;
  publicSummary: string;
  publicArea: string;
  publicLocation?: { latitude: number; longitude: number };
  media: Array<{ id: string; alt: string }>;
  status: ReportStatus;
  submittedAt: string;
  timeline: Array<{
    status: ReportStatus;
    occurredAt: string;
    update?: { en: string; fil: string };
  }>;
};

export type StoredReport = {
  private: ResidentReport;
  public: PublicReportDetail;
};

export type ReportStore = {
  getReceipt(
    key: string,
  ): Promise<{ reference: string; created: false } | null>;
  submitOnce(
    key: string,
    report: StoredReport,
  ): Promise<{ reference: string; created: boolean }>;
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

function parseSubmission(
  value: unknown,
  supportedCategories: readonly string[],
): ReportSubmission {
  const input =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const issues: Record<string, string> = {};
  const residentUid =
    typeof input.residentUid === "string" ? input.residentUid.trim() : "";
  const idempotencyKey =
    typeof input.idempotencyKey === "string" ? input.idempotencyKey.trim() : "";
  const category =
    typeof input.category === "string" &&
    supportedCategories.includes(input.category)
      ? (input.category as ReportCategory)
      : null;
  const description =
    typeof input.description === "string" ? input.description.trim() : "";
  const nearbyLandmark =
    typeof input.nearbyLandmark === "string" ? input.nearbyLandmark.trim() : "";
  const locationInput =
    typeof input.exactLocation === "object" && input.exactLocation !== null
      ? (input.exactLocation as Record<string, unknown>)
      : null;
  const exactLocation =
    locationInput &&
    typeof locationInput.latitude === "number" &&
    typeof locationInput.longitude === "number" &&
    typeof locationInput.privateDetails === "string"
      ? {
          latitude: locationInput.latitude,
          longitude: locationInput.longitude,
          privateDetails: locationInput.privateDetails.trim(),
        }
      : undefined;
  const evidenceInput = Array.isArray(input.evidence) ? input.evidence : [];
  const evidence = evidenceInput.filter((item): item is EvidenceAsset => {
    if (typeof item !== "object" || item === null) return false;
    const asset = item as Record<string, unknown>;
    return (
      typeof asset.id === "string" &&
      typeof asset.name === "string" &&
      typeof asset.size === "number" &&
      ["image/jpeg", "image/png", "image/webp"].includes(String(asset.type)) &&
      asset.visibility === "restricted"
    );
  });
  if (!residentUid || residentUid.length > 128)
    issues.residentUid = "A valid resident account is required.";
  if (idempotencyKey.length < 12 || idempotencyKey.length > 128)
    issues.idempotencyKey = "Start a fresh submission and try again.";
  if (!category) issues.category = "Choose a supported report category.";
  if (description.length < 20 || description.length > 1000)
    issues.description = "Use between 20 and 1,000 characters.";
  if (nearbyLandmark.length < 3 || nearbyLandmark.length > 160)
    issues.nearbyLandmark =
      "Use between 3 and 160 characters for the landmark.";
  if (
    locationInput &&
    (!exactLocation ||
      !Number.isFinite(exactLocation.latitude) ||
      !Number.isFinite(exactLocation.longitude) ||
      Math.abs(exactLocation.latitude) > 90 ||
      Math.abs(exactLocation.longitude) > 180 ||
      exactLocation.privateDetails.length > 200)
  )
    issues.exactLocation =
      "Choose a valid map point and keep private location details under 200 characters.";
  if (
    evidenceInput.length > 5 ||
    evidence.length !== evidenceInput.length ||
    evidence.some(
      (asset) =>
        !Number.isFinite(asset.size) ||
        asset.size <= 0 ||
        asset.size > 1_600_000,
    )
  )
    issues.evidence =
      "Attach up to 5 completed photos, no more than 1.6 MB each.";
  if (input.isEmergency !== false)
    issues.isEmergency = "Choose whether this is an emergency.";
  if (input.confirmNonEmergency !== true)
    issues.confirmNonEmergency = "Confirm that this is not an emergency.";
  if (input.confirmPublicSummary !== true)
    issues.confirmPublicSummary = "Confirm that a safe summary may be public.";
  if (Object.keys(issues).length) throw new ReportValidationError(issues);
  return {
    residentUid,
    idempotencyKey,
    category: category!,
    description,
    nearbyLandmark,
    exactLocation,
    evidence,
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
  nextReference = () =>
    `AS-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`,
  supportedCategories = reportCategories,
}: {
  store: ReportStore;
  now?: () => Date;
  nextReference?: () => string;
  supportedCategories?: readonly string[];
}) {
  return {
    async submit(value: unknown) {
      if (typeof value === "object" && value !== null) {
        const identity = value as Record<string, unknown>;
        const uid =
          typeof identity.residentUid === "string"
            ? identity.residentUid.trim()
            : "";
        const key =
          typeof identity.idempotencyKey === "string"
            ? identity.idempotencyKey.trim()
            : "";
        if (uid && uid.length <= 128 && key.length >= 12 && key.length <= 128) {
          const existing = await store.getReceipt(`${uid}:${key}`);
          if (existing) return existing;
        }
      }
      if (
        typeof value === "object" &&
        value !== null &&
        "isEmergency" in value &&
        value.isEmergency === true
      ) {
        throw new EmergencyReportError();
      }
      const input = parseSubmission(value, supportedCategories);
      const reference = nextReference();
      const submittedAt = now().toISOString();
      return store.submitOnce(`${input.residentUid}:${input.idempotencyKey}`, {
        private: {
          reference,
          reporterUid: input.residentUid,
          category: input.category,
          description: input.description,
          nearbyLandmark: input.nearbyLandmark,
          exactLocation: input.exactLocation,
          evidence: input.evidence,
          status: "Submitted",
          submittedAt,
        },
        public: {
          reference,
          category: input.category,
          publicSummary:
            publicSummaries[input.category] ??
            "A community concern was submitted for review.",
          publicArea: "Southville 1 · Location pending review",
          ...(input.exactLocation
            ? {
                publicLocation: {
                  latitude: Number(input.exactLocation.latitude.toFixed(2)),
                  longitude: Number(input.exactLocation.longitude.toFixed(2)),
                },
              }
            : {}),
          media: [],
          status: "Submitted",
          submittedAt,
          timeline: [{ status: "Submitted", occurredAt: submittedAt }],
        },
      });
    },
    listMine: (residentUid: string) => store.listByResident(residentUid),
    recover: (residentUid: string, key: string) =>
      store.getReceipt(`${residentUid}:${key}`),
    getPublic: (reference: string) => store.getPublic(reference),
  };
}

export function createMemoryReportStore(): ReportStore {
  const receipts = new Map<string, string>();
  const reports = new Map<string, StoredReport>();
  return {
    async getReceipt(key) {
      const reference = receipts.get(key);
      return reference ? { reference, created: false } : null;
    },
    async submitOnce(key, report) {
      const existingReference = receipts.get(key);
      if (existingReference)
        return { reference: existingReference, created: false };
      receipts.set(key, report.private.reference);
      reports.set(report.private.reference, report);
      return { reference: report.private.reference, created: true };
    },
    async listByResident(residentUid) {
      return [...reports.values()]
        .map((report) => report.private)
        .filter((report) => report.reporterUid === residentUid);
    },
    async getPublic(reference) {
      return reports.get(reference)?.public ?? null;
    },
  };
}
