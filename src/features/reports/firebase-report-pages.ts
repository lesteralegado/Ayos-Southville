import "server-only";
import { FieldPath, type Query } from "firebase-admin/firestore";
import type { PagePosition } from "./report-pages";

// Both fields are immutable. The document ID resolves tied submission times.
export function boundedReportQuery(query: Query, after: PagePosition | null, limit: number) {
  const ordered = query.orderBy("submittedAt", "desc").orderBy(FieldPath.documentId(), "desc");
  return (after ? ordered.startAfter(after.submittedAt, after.reference) : ordered).limit(limit);
}
