import Link from "next/link";
import { createPilotRelease, demoPilotFixture } from "@/features/pilot/pilot-release";

export const metadata = { title: "Pilot release | Ayos Southville", description: "Demonstration scope, measurement, and limitations for the Ayos Southville resident-led pilot." };

export default function PilotPage() {
  const release = createPilotRelease(demoPilotFixture);
  return <main className="release-page"><header className="composer-header"><Link className="brand" href="/">Ayos Southville</Link><span className="demo-badge">Demonstration mode</span></header><article className="release-content">
    <p className="eyebrow">Pilot and portfolio release</p><h1>A transparent test of one complete community-reporting journey.</h1>
    <div className="demo-disclosure" role="note"><strong>Demonstration data only.</strong> {release.disclosure.en}</div>
    <section><h2>The problem</h2><p>Southville 1 concerns arrive through scattered channels. Residents need privacy-safe reporting and visible progress; coordinators need one accountable history without implying government authority.</p></section>
    <section><h2>Architecture and privacy</h2><p>Next.js application boundaries separate public reports from exact locations, identities, private contact details, restricted media, and audit history. Firebase adapters provide authentication and persistence while domain modules validate roles and lifecycle transitions.</p></section>
    <section><h2>Demonstration coverage</h2><dl className="report-meta"><div><dt>Seeded participants</dt><dd>{release.participants.length}</dd></div><div><dt>Seeded reports</dt><dd>{release.analytics.totalReports}</dd></div><div><dt>Lifecycle states</dt><dd>{Object.keys(release.analytics.byStatus).length}</dd></div><div><dt>Evidence examples</dt><dd>{release.reports.filter((report)=>report.evidence.length).length}</dd></div></dl><p>The repeatable seed includes residents plus moderator, coordinator, and administrator roles; every normal lifecycle status; restricted and reviewed evidence; and public analytics.</p></section>
    <section><h2>Pilot measurement</h2><p>No real participant findings are claimed yet. The measurement contract records pseudonymous participation, unassisted submission, status comprehension, duplicate discovery, and lifecycle completion. Publish findings only after at least ten consented sessions.</p></section>
    <section><h2>Testing evidence</h2><p>Automated domain and UI tests cover validation, privacy contracts, authorization, lifecycle transitions, notifications, analytics, empty data, timezone-safe durations, and demo measurement. Manual accessibility, responsive, resilience, and performance protocols are maintained in the release evidence document.</p></section>
    <section><h2>Limitations</h2><ul><li>No official affiliation or guaranteed response from Barangay Niugan, Cabuyao City, NHA, or an HOA.</li><li>Emergency reports are redirected; this is not a dispatch service.</li><li>Demo analytics are synthetic and must never be presented as pilot findings.</li><li>Map/geocoding and production media delivery remain replaceable adapters.</li></ul></section>
    <div className="release-actions"><Link className="button button-primary" href="/reports/new">Try the resident journey</Link><Link className="button button-dark" href="/insights">View privacy-safe insights</Link></div>
  </article></main>;
}