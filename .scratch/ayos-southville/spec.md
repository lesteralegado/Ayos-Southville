# Ayos Southville

Status: ready-for-agent

## Problem Statement

Residents of Southville 1 in Barangay Niugan, Cabuyao City need a clear, trustworthy way to report non-emergency community problems and understand what happens after a report is submitted. Concerns such as damaged roads or drainage, broken streetlights, and missed waste collection may arrive through scattered conversations and channels. Residents can struggle to discover whether a concern has already been reported, who is handling it, whether progress has been made, or whether a reported resolution worked.

Community coordinators face the corresponding problem from the other side. Duplicate or incomplete reports are difficult to organize, updates are inconsistent, sensitive information can be shared too broadly, and the community lacks a reliable history of actions and outcomes.

The first release must remain honest about its authority. Ayos Southville is a resident-led pilot and must not imply that it is an official service of Barangay Niugan, the City of Cabuyao, the National Housing Authority, an HOA, or another community body unless a formal partnership is established later.

## Solution

Ayos Southville is a bilingual, mobile-first community issue-reporting application for Southville 1. A verified resident can document a non-emergency concern with a category, description, photos, an approximate public location, and private location details. Before submission, the application shows plausible nearby duplicates so the resident can support an existing report through an “I’m affected too” action and add evidence instead of fragmenting the issue.

Residents can browse a privacy-safe public map or accessible list, follow structured progress updates, receive in-app and email notifications, and confirm whether a reported resolution fixed the problem. A demonstration administrator can verify reports, protect sensitive content, merge duplicates, prioritize work, assign responsibility, update status, and record resolution evidence. Every administrative action appears in an audit timeline.

The initial pilot covers roads and drainage, broken streetlights, and waste collection. It routes emergencies away from the ordinary report queue to locally verified emergency channels. The primary product journey is:

**Resident submits a report → administrator processes it → resident confirms the resolution.**

The application is a real pilot intended for at least 10 Southville 1 residents, while remaining a frontend-focused portfolio project that demonstrates thoughtful forms, maps, media handling, responsive data views, optimistic interaction, localization, accessibility, privacy, and workflow state.

## User Stories

1. As a visitor, I want to understand that Ayos Southville is a resident-led pilot, so that I do not mistake it for an official government service.
2. As a visitor, I want to choose English or Filipino, so that I can use the application in the language I understand best.
3. As a visitor, I want the application to remember my language choice, so that I do not need to select it repeatedly.
4. As a resident, I want to create a verified account, so that I can submit reports and receive trusted updates.
5. As a resident, I want my real identity kept private from the public, so that reporting a local concern does not expose me.
6. As a resident, I want to choose a public display name, so that I can participate without publishing my full identity.
7. As a resident, I want to sign in and sign out securely, so that only I can manage my reports and notifications.
8. As a resident, I want a clear distinction between ordinary concerns and emergencies, so that urgent danger is not delayed in a normal queue.
9. As a resident reporting an emergency, I want to see verified emergency instructions and contact details immediately, so that I can reach the appropriate responder.
10. As a resident, I want to select roads and drainage, broken streetlights, or waste collection as a report category, so that my concern can be organized correctly.
11. As a resident, I want to describe the concern in plain language, so that a coordinator can understand what is wrong.
12. As a resident, I want helpful form guidance and validation, so that I can submit a complete report without assistance.
13. As a resident, I want to attach one or more photos, so that I can provide useful evidence.
14. As a resident on a limited connection, I want photos compressed before upload, so that submitting a report uses less time and data.
15. As a resident, I want to preview and remove selected photos, so that I can correct mistakes before submission.
16. As a resident, I want to place the issue on a map, so that coordinators can locate it.
17. As a resident, I want to enter a nearby landmark, so that the location remains understandable when map data is imprecise.
18. As a resident, I want to provide block, lot, or similarly precise location details privately, so that coordinators can find the issue without exposing my home publicly.
19. As a resident, I want the public location to be approximate, so that reports are discoverable without revealing a precise household location.
20. As a resident, I want an unfinished report saved as a draft, so that interruption or weak connectivity does not erase my work.
21. As a resident, I want to resume or discard my draft, so that I control unfinished reports.
22. As a resident, I want to see possible nearby duplicate reports before submitting, so that I do not create unnecessary duplicates.
23. As a resident, I want duplicate suggestions to explain why they may match, so that I can make an informed choice.
24. As a resident affected by an existing issue, I want to mark “I’m affected too,” so that the report reflects broader community impact.
25. As an affected resident, I want to add optional evidence to an existing report, so that coordinators receive new information without another ticket.
26. As a resident, I want to submit a new report when suggested matches are unrelated, so that valid concerns are not suppressed.
27. As a resident, I want a clear submission receipt and reference, so that I know the report was recorded.
28. As a resident, I want to view reports in a map, so that I can understand where concerns are concentrated.
29. As a resident, I want to view the same reports in a list, so that the application remains usable without relying on map interactions.
30. As a resident, I want to search and filter reports by category, status, date, and distance, so that I can find relevant concerns quickly.
31. As a resident, I want public report cards to omit reporter identity and precise location, so that community transparency does not compromise privacy.
32. As a resident, I want to see photos only after sensitive content has been reviewed when necessary, so that private or harmful material is not exposed.
33. As a resident, I want to follow a report, so that I can receive updates without claiming that I am directly affected.
34. As a resident, I want in-app notifications when a followed or submitted report changes, so that I can track progress.
35. As a resident, I want optional email notifications for important status changes, so that I can receive updates outside the application.
36. As a resident, I want to control notification preferences, so that I receive useful information without unwanted messages.
37. As a resident, I want to see the report’s current status and full public timeline, so that I understand what has happened.
38. As a resident, I want statuses explained in plain English or Filipino, so that administrative terms are not confusing.
39. As a resident, I want to know when a report is rejected or marked as a duplicate and why, so that the outcome is transparent.
40. As a resident whose report was merged, I want to be directed to the canonical report, so that I can continue following one source of truth.
41. As a resident, I want to see resolution evidence, so that I can judge whether the concern was addressed.
42. As the original reporter, I want to confirm that a resolution worked, so that the report can reach a resident-confirmed outcome.
43. As the original reporter, I want to say that the problem remains, so that an inadequate resolution can return for review.
44. As a moderator, I want a queue of newly submitted reports, so that I can review them consistently.
45. As a moderator, I want to verify that a report is non-emergency and within the pilot area, so that the queue contains appropriate work.
46. As a moderator, I want to redact or hide sensitive text, location details, and photos from public view, so that residents are protected.
47. As a moderator, I want to reject spam, abusive content, and reports outside the pilot scope with a reason, so that moderation is accountable.
48. As a moderator, I want to identify and merge duplicate reports, so that one canonical timeline represents the concern.
49. As a coordinator, I want to assign priority based on impact and urgency, so that the most consequential non-emergency concerns are visible.
50. As a coordinator, I want to assign a report to a responsible party or configurable destination, so that ownership is explicit even during a demonstration pilot.
51. As a coordinator, I want to move a report through Submitted, Under review, Assigned, In progress, Resolved, and Resident confirmed, so that progress is represented consistently.
52. As a coordinator, I want only valid status transitions to be available, so that the history cannot enter a contradictory state.
53. As a coordinator, I want to publish a resident-readable update with each meaningful transition, so that status changes have context.
54. As a coordinator, I want to attach resolution evidence, so that residents can evaluate the claimed outcome.
55. As an administrator, I want to manage categories and routing destinations, so that the pilot can expand without changing core application behavior.
56. As an administrator, I want to grant moderator, coordinator, and administrator roles, so that access follows responsibility.
57. As an administrator, I want privileged screens and actions protected by role, so that residents cannot access private information or administrative controls.
58. As an administrator, I want every privileged action recorded with actor, time, action, and reason, so that decisions are auditable.
59. As an administrator, I want to inspect exact report locations and private reporter contact details only when necessary, so that issues can be handled without broad exposure.
60. As a community member, I want aggregate counts by category and status, so that I can understand the community’s concerns.
61. As a community member, I want to see median time to first response and resolution, so that progress is visible without ranking individual workers.
62. As a community member, I want to see recurring problem areas at a privacy-safe level, so that patterns can be discussed without identifying households.
63. As a community member, I want to see how many resolutions residents confirmed, so that completion reflects resident experience.
64. As a user on a phone, I want all primary journeys to fit a narrow screen, so that I can use the service where I am.
65. As a keyboard user, I want to navigate forms, lists, dialogs, menus, and administration controls, so that mouse use is not required.
66. As a screen-reader user, I want meaningful names, instructions, errors, status announcements, and map alternatives, so that the service is understandable.
67. As a user with low vision, I want sufficient contrast and scalable content, so that I can read and operate the interface.
68. As a user who prefers reduced motion, I want non-essential animation reduced, so that the interface remains comfortable.
69. As a user on an unreliable connection, I want clear pending, retry, failure, and recovery states, so that I know whether an action succeeded.
70. As a resident, I want my optimistic actions reconciled with server results, so that the interface feels responsive without displaying false state.
71. As a pilot organizer, I want to observe whether at least 10 residents can test the service, so that the portfolio case study is grounded in real use.
72. As a pilot organizer, I want to measure whether at least 80% of testers can submit without assistance, so that form usability has a concrete success threshold.
73. As a pilot organizer, I want to learn whether residents understand current status and administrators can complete the lifecycle, so that the pilot validates the actual problem rather than vanity metrics.

## Implementation Decisions

- The application will be a frontend-focused web product built with React, Next.js, and TypeScript, using responsive server-rendered pages where useful and client-side interaction where required.
- Product surfaces will include a public landing page, authentication, resident reporting, public map and list discovery, report detail and timeline, personal reports and notifications, moderation and coordination queues, administration, and aggregate community insights.
- The product will use a backend service with relational data, authentication, object storage, and authorization. Application modules will depend on project-owned service interfaces rather than importing provider concerns throughout the UI.
- The highest testable seam is the application boundary for the complete lifecycle: a resident submits a report, an administrator processes it, and the resident confirms or disputes resolution. External email delivery, map tiles or geocoding, and image storage will be replaceable adapters at this seam.
- Core records will include users, resident profiles, roles, reports, report locations, media, affected-resident signals, followers, status events, administrative assignments, notifications, moderation actions, routing destinations, and audit events.
- Public and private report data will be separated deliberately. Public responses must never include exact household location, private reporter identity, contact details, internal moderation notes, or unapproved media.
- Public map coordinates will be reduced in precision or mapped to an approved public point. Exact coordinates and block or lot details will be restricted to authorized roles.
- Initial categories are roads and drainage, broken streetlights, and waste collection. Categories and their responsible destinations will be configurable rather than encoded as permanent branches in UI logic.
- The normal status progression is Submitted → Under review → Assigned → In progress → Resolved → Resident confirmed. Rejected and Duplicate are terminal side outcomes with required explanations. A disputed resolution returns to Under review while retaining its history.
- Status transitions will be validated on the server. Each accepted transition creates an immutable timeline event and, where relevant, notifications and an audit event.
- Reports will receive stable, human-readable references suitable for confirmation screens and support conversations.
- Duplicate suggestions will use category, geographic proximity, recency, and unresolved status. The MVP will present suggestions for human choice rather than automatically merging reports.
- “I’m affected too” is a unique relationship between a verified resident and a canonical report. Supporting evidence may be added subject to the same privacy and moderation rules as original evidence.
- Open public comments are excluded. Communication uses structured administrative updates, resident resolution feedback, affected-resident signals, and moderated evidence.
- The report composer will support local draft recovery. Drafts are private to the current device or verified account and are not public reports.
- Client-side image processing will resize and compress uploads while retaining sufficient detail for evidence. File count, size, and type limits will be enforced both before upload and at the service boundary.
- Uploaded media will remain private until access rules or moderation state permit public display. Signed or otherwise scoped access will be used for restricted assets.
- Authentication will verify a resident-controlled email address for the MVP. A public alias is separate from the private account identity. SMS verification and SMS notifications are deferred.
- Authorization will recognize Resident, Moderator, Coordinator, and Administrator capabilities. A pilot operator may hold multiple roles, but permissions remain distinct.
- Every privileged mutation will capture the actor, action, target, timestamp, and relevant reason or before/after state in an audit event.
- Emergency detection will begin with explicit user choice and prominent content guidance rather than pretending to be a reliable automated emergency classifier. Emergency contact content must be configurable and verified before deployment.
- The public map and list will consume the same privacy-filtered search contract. The list is a complete alternative, not a degraded fallback.
- Search supports category, status, date, and distance filters. URL-addressable filter state will allow views to be shared and recovered after refresh without exposing private data.
- Notifications will have in-app records and optional email delivery. Users can follow reports and configure email preferences. Delivery failures will not roll back the underlying report action.
- English and Filipino copy will use stable translation keys from the first implementation slice. User-generated content is not automatically translated in the MVP.
- Community analytics will expose aggregates only: category and status counts, median first-response time, median resolution time, privacy-safe recurring areas, and resident-confirmed resolutions. Individual staff rankings are forbidden.
- The interface will meet WCAG 2.2 AA intent for text, controls, focus, errors, and non-color status cues. Map interactions must always have list and form alternatives.
- Optimistic UI may be used for reversible, low-risk actions such as following or marking affected. Report creation, moderation, status changes, and role changes require authoritative server confirmation.
- Dates and times will be stored in a timezone-safe format and displayed for the Southville 1 audience using Asia/Manila time.
- The application will use loading, empty, validation, permission-denied, offline, retry, and unexpected-error states as designed product states rather than generic fallbacks.
- The initial implementation should remain deployable as a demonstration with seeded users and reports when no official recipient organization participates.

## Testing Decisions

- Good tests assert behavior visible at a public module or user boundary. They should describe what a resident or administrator can accomplish and should not assert component internals, hook calls, CSS classes, database implementation details, or third-party SDK behavior.
- The primary end-to-end seam covers registration or sign-in, report submission, duplicate choice, administrative review and progression, notification visibility, resolution evidence, and resident confirmation or dispute.
- External email, map or geocoding, and image-storage adapters will be controlled in tests so the complete application journey remains deterministic.
- Contract tests will verify that public report reads cannot expose private identity, contact, exact location, internal notes, or restricted media.
- Workflow tests will cover allowed and forbidden report transitions, required reasons, duplicate merging, canonical report redirection, resolution dispute, timeline creation, notifications, and audit events.
- Authorization tests will cover Resident, Moderator, Coordinator, and Administrator capabilities at the service boundary, including direct attempts to invoke forbidden actions rather than only hidden UI controls.
- Report-composer tests will cover required fields, bilingual validation, category selection, photo constraints, client-side compression outcomes, map and landmark entry, draft recovery, duplicate suggestions, successful submission, retry, and ambiguous failure recovery.
- Discovery tests will cover equivalent results between list and map contracts, filters, pagination or incremental loading, approximate public coordinates, and accessible non-map operation.
- Notification tests will verify preferences, follow behavior, in-app creation, email-adapter requests, and graceful handling of delivery failure.
- Analytics tests will verify aggregation definitions, empty datasets, timezone boundaries, median calculations, privacy thresholds, and exclusion of staff ranking.
- Accessibility checks will cover keyboard operation, focus restoration, labels and descriptions, validation summaries, live status announcements, dialog behavior, contrast-sensitive states, zoom, and reduced motion. Automated checks supplement rather than replace manual keyboard and screen-reader review.
- Responsive journey tests will cover representative narrow phone, tablet, and desktop viewports, with particular attention to report composition, filtering, timelines, and administrative tables or cards.
- Performance checks will use representative report and media volumes to validate responsive filtering, map/list rendering, image processing feedback, and avoidance of unnecessary network waterfalls.
- Pilot usability validation will measure whether at least 10 residents participate, at least 80% can submit a report without assistance, residents understand report status, duplicate discovery is usable, and an administrator can complete the lifecycle.
- There is no prior application code or test suite in this repository. The first implementation slice must establish the project’s testing conventions around the primary application seam rather than imitating nonexistent prior art.

## Out of Scope

- Claiming or implying official partnership with Barangay Niugan, the City of Cabuyao, the National Housing Authority, an HOA, or another organization without explicit authorization
- Dispatching emergency responders or accepting emergency reports into the ordinary issue queue
- Guaranteeing that a responsible organization will act on a report
- Open public comments, direct messaging, or unmoderated discussion
- SMS verification or SMS notifications
- Native iOS or Android applications
- Full offline report submission and background synchronization; recoverable drafts and clear connection states are included
- Automatic AI classification, moderation, duplicate merging, or priority assignment
- Facial recognition, identity-document collection, or public exposure of reporter identity
- Publishing exact home locations, private contact details, internal notes, or unapproved evidence
- Individual staff performance rankings
- Payments, donations, procurement, work orders, or contractor management
- Expansion beyond Southville 1 during the initial pilot
- Categories beyond roads and drainage, broken streetlights, and waste collection until routing and ownership are validated
- Formal integration with government, NHA, HOA, water district, emergency, or other external case-management systems

## Further Notes

- The community is understood to be the Southville 1 Housing Project in Barangay Niugan, Cabuyao City, Laguna. Public records supporting that interpretation include [PhilGEPS](https://notices.philgeps.gov.ph/GEPSNONPILOT/Tender/PrintableBidNoticeAbstractUI.aspx?refid=11448663), [DepEd’s Cabuyao City inventory](https://nid.deped.gov.ph/public-dashboard/region/Region%20IV-A/division/Cabuyao%20City?filter=with-projects), and an [NHA FOI response](https://www.foi.gov.ph/requests/southville-1-cabuyao-laguna/). Location and governance relationships must still be verified locally before public launch.
- Southville 1 appears to be a housing project or community within Barangay Niugan rather than a separate barangay. Routing should therefore be configurable and must not assume that one organization owns every issue category.
- Ayos Southville is a working product name. Branding must retain the resident-led pilot disclosure until formal authorization changes that status.
- The expected MVP window is four to six weeks, prioritizing one complete reporting lifecycle before aggregate analytics and final bilingual polish.
- The portfolio case study should document the real problem, privacy decisions, pilot evidence, observed usability problems, changes made after testing, and limitations. It should not inflate demo data or imply institutional adoption.
- After this specification, `/to-tickets` should divide the work into vertical tracer-bullet tickets with explicit blocking edges.
