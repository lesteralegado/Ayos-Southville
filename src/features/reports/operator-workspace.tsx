"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useLocale } from "@/features/i18n/use-locale";
import { EvidencePicker } from "./evidence-picker";
import { OperatorReviewPanel } from "./operator-review-panel";
import { reviewCopy } from "./review-copy";
import type { EvidenceAsset } from "./report-module";
import type { ModerationReport, Operator, QueueReport } from "./moderation-module";
import {
  formatManilaDate,
  reportStatusLabels,
  reportCategoryLabels,
} from "./report-presentation";

type Destination = { id: string; name: string };
type Props = {
  initialReports: (QueueReport | ModerationReport)[];
  initialNextCursor?: string | null;
  initialSelectedReport?: ModerationReport | null;
  actor: Operator;
  destinations: Destination[];
};
export function OperatorWorkspace({
  initialReports,
  initialNextCursor = null,
  initialSelectedReport,
  actor,
  destinations,
}: Props) {
  const { locale, chooseLocale } = useLocale();
  const t = (en: string, fil: string) => (locale === "fil" ? fil : en);
  const [reports, setReports] = useState<QueueReport[]>(initialReports);
  const [selected, setSelected] = useState(initialReports.find((report) => ["Submitted", "Under review", "Assigned", "In progress"].includes(report.status))?.reference ?? initialReports[0]?.reference ?? "");
  const [filter, setFilter] = useState("active");
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [chosen, setChosen] = useState<ModerationReport | null>(initialSelectedReport ?? (initialReports[0] && "history" in initialReports[0] ? initialReports[0] : null));
  const [pending, setPending] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const shown = reports;
  async function readDetail(reference: string) {
    const response = await fetch(`/api/moderation?reference=${encodeURIComponent(reference)}`, { cache: "no-store", signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(t("Could not load this report. Reload and retry.", "Hindi ma-load ang ulat. I-reload at subukang muli."));
    return (await response.json()).report as ModerationReport;
  }
  async function selectReport(reference: string) {
    if (busy.current) return;
    busy.current = true; setPending(true); setError("");
    try { setChosen(await readDetail(reference)); setSelected(reference); setNotice(""); }
    catch { setError(t("Could not load this report. Reload and retry.", "Hindi ma-load ang ulat. I-reload at subukang muli.")); }
    finally { busy.current = false; setPending(false); }
  }
  async function reload(pageCursor = cursor, requestedFilter = filter) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const params = new URLSearchParams({ filter: requestedFilter });
      if (pageCursor) params.set("cursor", pageCursor);
      const response = await fetch(`/api/moderation?${params}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok)
        throw new Error(
          t(
            "Could not refresh. Check your access and retry.",
            "Hindi ma-refresh. Suriin ang access at subukang muli.",
          ),
        );
      const next = await response.json();
      const reference = requestedFilter === filter && pageCursor === cursor ? selected : next.reports[0]?.reference;
      const detail = reference ? await readDetail(reference) : null;
      setReports(next.reports);
      setNextCursor(next.nextCursor); setCursor(pageCursor); setFilter(requestedFilter);
      setChosen(detail); setSelected(reference ?? "");
      setUnconfirmed(false);
      setNotice(
        t(
          "Latest reports loaded. Review the current state before retrying.",
          "Na-load ang pinakabagong ulat. Suriin ang kasalukuyang estado bago subukang muli.",
        ),
      );
    } catch {
      setError(
        t(
          "Connection lost. Reconnect and reload the workspace.",
          "Nawala ang koneksyon. Kumonekta at i-reload ang workspace.",
        ),
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function mutate(action: string, input: Record<string, unknown>) {
    if (busy.current) return;
    busy.current = true;
    setUnconfirmed(true);
    setPending(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/moderation", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, input }),
        signal: AbortSignal.timeout(30000),
      });
      const result = await response.json();
      if (!response.ok) {
        setUnconfirmed(false);
        throw new Error(
          locale === "en"
            ? result.error
            : result.code === "CONFLICT"
              ? "Nagbago ang ulat. I-reload at suriin bago subukang muli."
              : result.code === "FORBIDDEN"
                ? "Wala kang pahintulot. Bumalik sa account at mag-sign in muli."
                : "Suriin ang mga detalye, dalawang wika, at nakumpirmang mga upload. Subukang muli.",
        );
      }
      // A separate refresh can fail after a successful mutation. Never invite blind retry.
      const params = new URLSearchParams({ filter });
      if (cursor) params.set("cursor", cursor);
      const current = await fetch(`/api/moderation?${params}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      });
      if (!current.ok)
        throw new Error(
          t(
            "Change saved, but refresh failed. Reload before taking another action.",
            "Nai-save ang pagbabago, ngunit hindi ma-refresh. I-reload bago gumawa ng ibang aksyon.",
          ),
        );
      const page = await current.json();
      const detail = await readDetail(selected);
      setReports(page.reports); setNextCursor(page.nextCursor); setChosen(detail);
      setUnconfirmed(false);
      setNotice(
        t(
          "Change saved. The workspace is up to date.",
          "Nai-save ang pagbabago. Napapanahon ang workspace.",
        ),
      );
      detailHeading.current?.focus({ preventScroll: true });
    } catch (failure) {
      setError(
        failure instanceof TypeError ||
          (failure instanceof Error && failure.name === "TimeoutError")
          ? t(
              "Connection interrupted. Reload to check whether the action saved before retrying.",
              "Naputol ang koneksyon. I-reload upang tingnan kung nai-save bago subukang muli.",
            )
          : failure instanceof Error
            ? failure.message
            : t(
                "Action unavailable. Reload and retry.",
                "Hindi magawa ang aksyon. I-reload at subukang muli.",
              ),
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <main className="admin-page operator-page">
      <header className="composer-header">
        <Link className="brand" href="/">
          Ayos Southville
        </Link>
        <div className="admin-header-actions">
          <Link href="/account">{t("My account", "Aking account")}</Link>
          <button
            className="language-button"
            type="button"
            onClick={() => chooseLocale(locale === "en" ? "fil" : "en")}
          >
            {locale === "en" ? "Filipino" : "English"}
          </button>
        </div>
      </header>
      <div className="admin-shell">
        <h1>{t("Report operations", "Pamamahala ng mga ulat")}</h1>
        <p className="admin-intro">
          {t(
            "Review privately, publish carefully, and carry each report through resolution. Independent resident-led pilot; destinations are internal pilot desks.",
            "Suriin nang pribado, maingat na ilathala, at subaybayan hanggang malutas. Independent na pilot ng mga residente; internal na pilot desk ang mga destinasyon.",
          )}
        </p>
        <div className="operator-toolbar">
          <label>
            {t("Report status", "Estado ng ulat")}
            <select
              aria-label={t("Report status", "Estado ng ulat")}
              value={filter}
              disabled={pending || unconfirmed}
              onChange={(event) => void reload(null, event.target.value)}
            >
              <option value="active">
                {t("Actionable reports", "Mga ulat na kailangan ng aksyon")}
              </option>
              <option value="all">{t("All reports", "Lahat ng ulat")}</option>
              <option value="overdue">{reviewCopy[locale].overdueFilter}</option>
              {Object.entries(reportStatusLabels[locale]).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>
          <button
            className="button button-quiet"
            disabled={pending}
            type="button"
            onClick={() => void reload()}
          >
            {t("Reload workspace", "I-reload ang workspace")}
          </button>
        </div>
        <p role="status" aria-live="polite">
          {pending
            ? t(
                "Saving or loading current reports…",
                "Sine-save o nilo-load ang kasalukuyang mga ulat…",
              )
            : notice}
        </p>
        {error && (
          <div className="admin-error" role="alert">
            {error}
          </div>
        )}
        <div className="operator-layout">
          <nav aria-label={t("Reports", "Mga ulat")} className="operator-queue">
            {shown.length === 0 ? (
              <p>
                {t(
                  nextCursor ? "No matches in this group. Continue checking older reports." : "No matching reports. Choose another status or reload to check for new submissions.",
                  nextCursor ? "Walang tugma sa pangkat na ito. Ipagpatuloy ang pagsusuri ng mas lumang ulat." : "Walang tugmang ulat. Pumili ng ibang estado o i-reload para sa bagong ulat.",
                )}
              </p>
            ) : (
              shown.map((report) => (
                <button
                  type="button"
                  key={report.reference}
                  disabled={pending || unconfirmed}
                  aria-current={
                    selected === report.reference ? "true" : undefined
                  }
                  onClick={() => void selectReport(report.reference)}
                >
                  <strong>{report.reference}</strong>
                  <span>{reportStatusLabels[locale][report.status]}</span>
                  {report.reviewExpectation?.overdue && <strong>{reviewCopy[locale].overdue}</strong>}
                  <span>
                    {reportCategoryLabels[locale][report.category] ??
                      report.category}
                  </span>
                  <time dateTime={report.submittedAt}>
                    {formatManilaDate(report.submittedAt, locale)}
                  </time>
                </button>
              ))
            )}
            {nextCursor && <button className="button button-quiet" type="button" disabled={pending || unconfirmed} onClick={() => void reload(nextCursor)}>{filter === "overdue" ? t("Continue checking older reports", "Ipagpatuloy ang mas lumang ulat") : t("Next reports", "Susunod na mga ulat")}</button>}
            {cursor && <button className="button button-quiet" type="button" disabled={pending || unconfirmed} onClick={() => void reload(null)}>{t("Start of list", "Simula ng listahan")}</button>}
          </nav>
          {chosen ? (
            <section
              className="operator-detail"
              aria-labelledby="operator-detail-title"
              aria-busy={pending}
            >
              <h2 id="operator-detail-title" tabIndex={-1} ref={detailHeading}>
                {chosen.reference} · {reportStatusLabels[locale][chosen.status]}
              </h2>
              <OperatorReport
                key={chosen.reference + ":" + (chosen.revision ?? 0)}
                report={chosen}
                actor={actor}
                destinations={destinations}
                locale={locale}
                pending={pending || unconfirmed}
                mutate={mutate}
              />
            </section>
          ) : (
            <p>
              {t(
                "Select a report to inspect its private details and available actions.",
                "Pumili ng ulat upang suriin ang pribadong detalye at mga aksyon.",
              )}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

function CanonicalReportLookup({ currentReference, locale, onChoose }: { currentReference: string; locale: "en" | "fil"; onChoose: (report: ModerationReport | null) => void }) {
  const [reference, setReference] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState("");
  const t = (en: string, fil: string) => locale === "fil" ? fil : en;
  async function lookup() {
    if (pending) return;
    setPending(true); setResult(""); onChoose(null);
    try {
      const response = await fetch(`/api/moderation?reference=${encodeURIComponent(reference.trim().toUpperCase())}`, { cache: "no-store", signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error();
      const report = (await response.json()).report as ModerationReport;
      if (report.reference === currentReference || !report.approved || !["Under review", "Assigned", "In progress"].includes(report.status)) throw new Error();
      onChoose(report); setResult(`${report.reference}: ${report.public.summary}`);
    } catch { setResult(t("No approved active report found. Check the reference and retry.", "Walang aprubadong aktibong ulat. Suriin ang sanggunian at subukang muli.")); }
    finally { setPending(false); }
  }
  return <div>
    <label>{t("Canonical report", "Pangunahing ulat")}<input name="canonical" required disabled={pending} value={reference} maxLength={80} onChange={event => { setReference(event.target.value); onChoose(null); setResult(""); }} aria-describedby="canonical-help" /></label>
    <p id="canonical-help">{t("Enter an approved active report reference, including one from another page.", "Ilagay ang sanggunian ng aprubadong aktibong ulat, kahit mula sa ibang pahina.")}</p>
    <button className="button button-quiet" type="button" disabled={pending || !reference.trim()} onClick={() => void lookup()}>{t("Find canonical report", "Hanapin ang pangunahing ulat")}</button>
    <p role="status" aria-live="polite">{pending ? t("Checking report…", "Sinusuri ang ulat…") : result}</p>
  </div>;
}

function OperatorReport({
  report,
  actor,
  destinations,
  locale,
  pending,
  mutate,
}: {
  report: ModerationReport;
  actor: Operator;
  destinations: Destination[];
  locale: "en" | "fil";
  pending: boolean;
  mutate: (action: string, input: Record<string, unknown>) => Promise<void>;
}) {
  const t = (en: string, fil: string) => (locale === "fil" ? fil : en);
  const canReview = actor.roles.some((role) =>
    ["Moderator", "Administrator"].includes(role),
  );
  const canProcess = actor.roles.some((role) =>
    ["Coordinator", "Administrator"].includes(role),
  );
  const [decision, setDecision] = useState("accept");
  const [assets, setAssets] = useState<EvidenceAsset[]>([]);
  const [uploadBlocked, setUploadBlocked] = useState(true);
  const [canonical, setCanonical] = useState<ModerationReport | null>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "");
    const base = {
      reference: report.reference,
      expectedRevision: report.revision ?? 0,
      reason: text("reason"),
      update: { en: text("en"), fil: text("fil") },
    };
    if (report.status === "Submitted") {
      if (decision === "accept") {
        const lat = text("latitude"),
          lon = text("longitude");
        void mutate("accept", {
          ...base,
          update: undefined,
          publicSummary: text("summary"),
          publicArea: text("area"),
          ...(lat && lon
            ? {
                publicLocation: {
                  latitude: Number(lat),
                  longitude: Number(lon),
                },
              }
            : {}),
          approvedMedia: data
            .getAll("approved")
            .map((id) => ({ id, alt: text("alt-" + id) })),
        });
      } else if (decision === "reject")
        void mutate("reject", { ...base, category: text("category") });
      else {
        if (!canonical) return;
        void mutate("merge", {
          ...base,
          duplicateReference: report.reference,
          canonicalReference: canonical?.reference,
          canonicalRevision: canonical?.revision ?? 0,
        });
      }
    } else if (report.status === "Under review")
      void mutate("assign", {
        ...base,
        priority: text("priority"),
        destination: text("destination"),
      });
    else
      void mutate("transition", {
        ...base,
        to: report.status === "Assigned" ? "In progress" : "Resolved",
        resolutionEvidence: assets,
      });
  }
  return (
    <>
      <OperatorReviewPanel report={report} actor={actor} locale={locale} pending={pending} mutate={mutate} />
      <section className="operator-private">
        <h3>
          {t("Private resident details", "Pribadong detalye ng residente")}
        </h3>
        <p>
          {t(
            "Restricted to authorized operators. Never copy household details or contact information into public fields.",
            "Para lamang sa awtorisadong operator. Huwag ilagay sa pampublikong field ang detalye ng tahanan o contact.",
          )}
        </p>
        <dl>
          <dt>{t("Original description", "Orihinal na paglalarawan")}</dt>
          <dd>{report.description}</dd>
          <dt>{t("Nearby landmark", "Malapit na palatandaan")}</dt>
          <dd>{report.nearbyLandmark}</dd>
          {report.exactLocation && (
            <>
              <dt>
                {t("Exact private location", "Eksaktong pribadong lokasyon")}
              </dt>
              <dd>
                {report.exactLocation.latitude},{" "}
                {report.exactLocation.longitude}
                <br />
                {report.exactLocation.privateDetails}
              </dd>
            </>
          )}
        </dl>
        <div className="operator-media">
          {[
            ...report.evidence,
            ...report.supportingEvidence,
            ...(report.resolutionEvidence ?? []),
          ].map((asset, index) => (
            <a
              key={asset.id + ":" + index}
              href={"/api/evidence/" + asset.id}
              target="_blank"
              rel="noreferrer"
            >
              {/* Restricted evidence must bypass public image optimization caches. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={"/api/evidence/" + asset.id}
                alt={
                  t(
                    "Private evidence photo",
                    "Pribadong litrato bilang ebidensya",
                  ) +
                  " " +
                  (index + 1)
                }
              />
              <span>
                {t("Open private photo", "Buksan ang pribadong litrato")}{" "}
                {index + 1}
              </span>
            </a>
          ))}
        </div>
      </section>
      {report.status !== "Submitted" && report.status !== "Rejected" && (
        <section className="operator-public">
          <h3>
            {t(
              "Approved public information",
              "Aprubadong pampublikong impormasyon",
            )}
          </h3>
          <p>{report.public.summary}</p>
          <p>{report.public.area}</p>
          {report.public.canonicalReference && (
            <p>
              {t("Canonical report", "Pangunahing ulat")}:{" "}
              {report.public.canonicalReference}
            </p>
          )}
          {report.destination && (
            <p>
              {t("Internal destination", "Internal na destinasyon")}:{" "}
              {destinations.find((item) => item.id === report.destination)
                ?.name ?? report.destination}{" "}
              · {t("Priority", "Prayoridad")}: {report.priority}
            </p>
          )}
        </section>
      )}
      {(
        report.status === "Submitted"
          ? canReview
          : ["Under review", "Assigned", "In progress"].includes(
              report.status,
            ) && canProcess
      ) ? (
        <form onSubmit={submit}>
          <fieldset disabled={pending}>
            <legend>{t("Next action", "Susunod na aksyon")}</legend>
            {report.status === "Submitted" && (
              <>
                <label>
                  {t("Review decision", "Desisyon sa pagsusuri")}
                  <select
                    aria-label={t("Review decision", "Desisyon sa pagsusuri")}
                    value={decision}
                    onChange={(event) => setDecision(event.target.value)}
                  >
                    <option value="accept">
                      {t(
                        "Accept with redaction",
                        "Tanggapin na may pag-redact",
                      )}
                    </option>
                    <option value="reject">
                      {t("Reject with reason", "Tanggihan na may dahilan")}
                    </option>
                    <option value="merge">
                      {t("Merge duplicate", "Pagsamahin ang duplikado")}
                    </option>
                  </select>
                </label>
                {decision === "accept" && (
                  <>
                    <p>
                      {t(
                        "Only these approved fields will become public. Coordinates are rounded to protect households. Selected photos become public; leave photos with identifying details unselected.",
                        "Ang aprubadong mga field lamang ang ilalathala. Ni-round ang coordinate para protektahan ang tahanan. Pampubliko ang piniling litrato; huwag piliin ang may pribadong pagkakakilanlan.",
                      )}
                    </p>
                    <label>
                      {t("Public summary", "Pampublikong buod")}
                      <textarea name="summary" required maxLength={4000} />
                    </label>
                    <label>
                      {t("Public area", "Pampublikong lugar")}
                      <input name="area" required maxLength={1000} />
                    </label>
                    <div className="operator-coordinate-row">
                      <label>
                        {t("Approximate latitude", "Tinatayang latitude")}
                        <input
                          name="latitude"
                          type="number"
                          step="0.01"
                          min="-90"
                          max="90"
                        />
                      </label>
                      <label>
                        {t("Approximate longitude", "Tinatayang longitude")}
                        <input
                          name="longitude"
                          type="number"
                          step="0.01"
                          min="-180"
                          max="180"
                        />
                      </label>
                    </div>
                    {report.evidence.map((asset, index) => (
                      <div className="operator-approval" key={asset.id}>
                        <label>
                          <input
                            type="checkbox"
                            name="approved"
                            value={asset.id}
                          />
                          {t("Approve photo", "Aprubahan ang litrato")}{" "}
                          {index + 1}
                        </label>
                        <label>
                          {t(
                            "Alternative text for photo",
                            "Alternatibong teksto para sa litrato",
                          )}{" "}
                          {index + 1}
                          <input name={"alt-" + asset.id} maxLength={1000} />
                        </label>
                      </div>
                    ))}
                  </>
                )}
                {decision === "reject" && (
                  <label>
                    {t("Rejection category", "Kategorya ng pagtanggi")}
                    <select name="category" aria-label={t("Rejection category", "Kategorya ng pagtanggi")}>
                      {[
                        ["spam", "Spam", "Spam"],
                        ["abusive", "Abusive", "Mapang-abuso"],
                        ["emergency", "Emergency", "Emergency"],
                        [
                          "out-of-area",
                          "Outside pilot area",
                          "Labas sa lugar ng pilot",
                        ],
                        [
                          "out-of-scope",
                          "Outside pilot scope",
                          "Labas sa saklaw ng pilot",
                        ],
                      ].map(([value, en, fil]) => (
                        <option key={value} value={value}>
                          {t(en, fil)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {decision === "merge" && (
                  <CanonicalReportLookup currentReference={report.reference} locale={locale} onChoose={setCanonical} />
                )}
              </>
            )}
            {(report.status === "Submitted" ||
              report.status === "Under review") && (
              <label>
                {t("Decision reason", "Dahilan ng desisyon")}
                <textarea name="reason" required maxLength={4000} />
              </label>
            )}
            {report.status === "Under review" && (
              <>
                <label>
                  {t("Priority", "Prayoridad")}
                  <select name="priority" aria-label={t("Priority", "Prayoridad")} defaultValue="normal">
                    {[
                      ["low", "Low", "Mababa"],
                      ["normal", "Normal", "Karaniwan"],
                      ["high", "High", "Mataas"],
                      ["urgent", "Urgent", "Agarang aksyon"],
                    ].map(([value, en, fil]) => (
                      <option key={value} value={value}>
                        {t(en, fil)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("Internal destination", "Internal na destinasyon")}
                  <select name="destination" aria-label={t("Internal destination", "Internal na destinasyon")} required defaultValue="">
                    <option value="">
                      {t("Choose an active desk", "Pumili ng aktibong desk")}
                    </option>
                    {destinations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {report.status !== "Submitted" && (
              <>
                <label>
                  {t("English update", "Update sa English")}
                  <textarea name="en" required maxLength={4000} />
                </label>
                <label>
                  {t("Filipino update", "Update sa Filipino")}
                  <textarea name="fil" required maxLength={4000} />
                </label>
                <p>
                  {t(
                    "Both updates are public. Keep private identity and exact locations out.",
                    "Pampubliko ang dalawang update. Huwag isama ang pribadong pagkakakilanlan at eksaktong lokasyon.",
                  )}
                </p>
              </>
            )}
            {report.status === "In progress" && (
              <>
                <h3>
                  {t(
                    "Protected resolution evidence",
                    "Pribadong ebidensya ng paglutas",
                  )}
                </h3>
                <p>
                  {t(
                    "At least one completed upload is required before marking resolved.",
                    "Kailangan ang kahit isang nakumpletong upload bago markahang nalutas.",
                  )}
                </p>
                <EvidencePicker
                  required
                  owner={actor.uid}
                  draftKey={"resolution_" + report.reference}
                  locale={locale}
                  onAssets={setAssets}
                  onBlocked={setUploadBlocked}
                />
              </>
            )}
            <button
              className="button button-primary"
              type="submit"
              disabled={
                pending ||
                (report.status === "Submitted" && decision === "merge" && !canonical) ||
                (report.status === "In progress" &&
                  (uploadBlocked || !assets.length))
              }
            >
              {report.status === "Submitted"
                ? decision === "accept"
                  ? t("Accept and publish", "Tanggapin at ilathala")
                  : decision === "reject"
                    ? t("Reject report", "Tanggihan ang ulat")
                    : t("Merge duplicate", "Pagsamahin ang duplikado")
                : report.status === "Under review"
                  ? t("Assign report", "Italaga ang ulat")
                  : report.status === "Assigned"
                    ? t("Start work", "Simulan ang gawain")
                    : t("Mark resolved", "Markahang nalutas")}
            </button>
          </fieldset>
        </form>
      ) : (
        <p>
          {["Resolved", "Resident confirmed", "Rejected", "Duplicate"].includes(
            report.status,
          )
            ? t(
                "No operator transition is available in this state. Resident confirmation or dispute happens through the resident account.",
                "Walang aksyon ng operator sa estadong ito. Sa account ng residente ginagawa ang pagkumpirma o pagtutol.",
              )
            : t(
                "Your role can inspect this report. A moderator or coordinator with the required capability must perform the next action.",
                "Maaari mong suriin ang ulat. Kailangan ang tagasuri o tagapag-ugnay na may tamang kakayahan para sa susunod na aksyon.",
              )}
        </p>
      )}
      <section className="operator-history">
        <h3>
          {t("Private activity history", "Pribadong kasaysayan ng aksyon")}
        </h3>
        {report.history.length ? (
          <ol>
            {report.history.map((event, index) => (
              <li key={index}>
                <strong>
                  {event.action === "review-acknowledged" ? reviewCopy[locale].acknowledged
                    : event.action === "external-follow-up" ? reviewCopy[locale].external
                    : event.action === "review-takeover" ? reviewCopy[locale].takeoverRecorded
                    : event.status ? reportStatusLabels[locale][event.status]
                    : event.action}
                </strong>
                <time dateTime={event.occurredAt}>
                  {formatManilaDate(event.occurredAt, locale, true)}
                </time>
                {event.reason && <p>{event.reason}</p>}
                {event.update && <p>{event.update[locale]}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p>
            {t(
              "Actions will appear here after review.",
              "Lalabas dito ang mga aksyon matapos ang pagsusuri.",
            )}
          </p>
        )}
      </section>
    </>
  );
}
