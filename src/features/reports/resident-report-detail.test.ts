import { residentReportDetail } from './resident-report-detail';
import type { ResidentReport } from './report-module';

const report: ResidentReport = {
  reference: 'AS-PRIVATE', reporterUid: 'resident', category: 'streetlights',
  description: 'Synthetic streetlight concern beside the court.', nearbyLandmark: 'Covered court',
  evidence: [], status: 'Rejected', submittedAt: '2026-10-15T01:00:00Z',
};

it('shows a legacy rejection reason and review updates without exposing internal notes or identity', () => {
  const detail = residentReportDetail({ ...report, history: [
    { action: 'review-takeover', status: 'Submitted', occurredAt: '2026-10-15T02:00:00Z', reason: 'Internal contact', update: { en: 'Review delayed.', fil: 'Naantala ang pagsusuri.' } },
    { action: 'external-follow-up', occurredAt: '2026-10-15T03:00:00Z', reason: 'Internal correspondence' },
    { action: 'rejected:out-of-scope', occurredAt: '2026-10-15T04:00:00Z', reason: 'This test concern is outside the pilot categories.' },
  ] });
  expect(detail.timeline).toEqual([
    { status: 'Submitted', occurredAt: report.submittedAt },
    { status: 'Submitted', occurredAt: '2026-10-15T02:00:00Z', update: { en: 'Review delayed.', fil: 'Naantala ang pagsusuri.' } },
    { status: 'Rejected', occurredAt: '2026-10-15T04:00:00Z', update: { en: 'This test concern is outside the pilot categories.', fil: 'This test concern is outside the pilot categories.' } },
  ]);
  expect(detail).not.toHaveProperty('reporterUid');
  expect(JSON.stringify(detail)).not.toContain('Internal');
});

it('preserves the submitted receipt before any operator history exists', () => {
  expect(residentReportDetail({ ...report, status: 'Submitted' }).timeline).toEqual([
    { status: 'Submitted', occurredAt: report.submittedAt },
  ]);
});
