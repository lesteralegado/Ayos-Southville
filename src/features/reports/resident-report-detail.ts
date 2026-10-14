import type { PublicReportDetail, ResidentReport } from './report-module';

// Call only after ownership has been established. Never use this as a public projection.
export function residentReportDetail(report: ResidentReport): PublicReportDetail {
  const timeline: PublicReportDetail['timeline'] = [
    { status: 'Submitted', occurredAt: report.submittedAt },
  ];
  for (const event of report.history ?? []) {
    if (event.action.startsWith('rejected:')) {
      timeline.push({
        status: 'Rejected', occurredAt: event.occurredAt,
        ...(event.reason ? { update: { en: event.reason, fil: event.reason } } : {}),
      });
    } else if (event.status && event.update && event.action !== 'submitted') {
      timeline.push({ status: event.status, occurredAt: event.occurredAt, update: event.update });
    }
  }
  return {
    reference: report.reference, category: report.category, status: report.status,
    publicSummary: report.description, publicArea: report.nearbyLandmark,
    submittedAt: report.submittedAt, media: [], timeline,
  };
}
