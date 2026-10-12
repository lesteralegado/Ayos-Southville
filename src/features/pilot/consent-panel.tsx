"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale } from "@/features/i18n/use-locale";
import { consentReceipt, consentVersion, type ConsentReceipt } from "./participation-consent";
import { consentCopy } from "./consent-copy";
type Notice = "" | "failure" | "permission" | "validation" | "changed" | "limited";
export function ConsentPanel() {
  const { locale } = useLocale(), copy = consentCopy[locale];
  const [receipt, setReceipt] = useState<ConsentReceipt | null>(null), [eligible, setEligible] = useState(false);
  const [loading, setLoading] = useState(true), [pending, setPending] = useState(false), [attempt, setAttempt] = useState(0);
  const [statusConfirmed, setStatusConfirmed] = useState(false);
  const [adult, setAdult] = useState(false), [agreed, setAgreed] = useState(false), [declined, setDeclined] = useState(false);
  const [notice, setNotice] = useState<Notice>("");
  const resultRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    let active = true;
    fetch("/api/participation", { cache: "no-store", signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "permission" : "failure");
      const value = await response.json();
      if (value.version !== consentVersion) throw new Error("changed");
      const confirmed = consentReceipt(value.receipt);
      if (value.receipt && !confirmed) throw new Error("failure");
      if (active) { setReceipt(confirmed); setEligible(value.eligible === true); setStatusConfirmed(true); setNotice(""); }
    }).catch(error => { if (active) setNotice(error.message === "permission" ? "permission" : error.message === "changed" ? "changed" : "failure"); })
      .finally(() => { clearTimeout(timer); if (active) setLoading(false); });
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [attempt]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!adult || !agreed) { setNotice("validation"); return; }
    setPending(true); setStatusConfirmed(false); setNotice("");
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/participation", { method: "POST", headers: { "content-type": "application/json" }, cache: "no-store", signal: controller.signal,
        body: JSON.stringify({ version: consentVersion, adultAcknowledged: adult, consent: agreed, locale }) });
      const value = await response.json();
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "permission" : response.status === 422 ? "validation" : response.status === 409 ? "changed" : response.status === 429 ? "limited" : "failure");
      const confirmed = consentReceipt(value.receipt);
      if (!confirmed) throw new Error("failure");
      setReceipt(confirmed);
      setStatusConfirmed(true);
      requestAnimationFrame(() => resultRef.current?.focus());
    } catch (error) { const code = error instanceof Error ? error.message : "failure"; setNotice(["permission", "validation", "changed", "limited"].includes(code) ? code as Notice : "failure"); }
    finally { clearTimeout(timer); setPending(false); }
  }
  return <section id="participation" className="consent-section" aria-labelledby="participation-title">
    <h2 id="participation-title">{copy.title}</h2>
    <div aria-labelledby="consent-disclosure">
      <h3 id="consent-disclosure">{copy.disclosure}</h3>
      <p>{copy.trial}</p><p>{copy.boundaries}</p><p>{copy.retention}</p><p>{copy.deletion}</p><p>{copy.recruitment}</p>
      <p><Link href="/privacy" className="text-link">{copy.privacy}</Link></p>
    </div>
    <p role="status" aria-live="polite">{loading ? copy.loading : pending ? copy.pending : declined ? copy.declined : !receipt && !notice ? copy.noConsent : ""}</p>
    {notice && <p id="consent-error" className="form-error" role="alert">{copy[notice]}</p>}
    {!loading && !eligible && !notice && <p>{copy.permission}</p>}
    {receipt ? <div className="consent-receipt">
      <h3 tabIndex={-1} ref={resultRef}>{copy.receipt}</h3><p>{copy.receiptHelp}</p>
      <dl><dt>{copy.id}</dt><dd>{receipt.id}</dd><dt>{copy.version}</dt><dd>{receipt.version}</dd><dt>{copy.date}</dt><dd><time dateTime={receipt.consentedAt}>{new Date(receipt.consentedAt).toLocaleString(locale === "fil" ? "fil-PH" : "en-PH", { timeZone: "Asia/Manila" })}</time></dd><dt>{copy.language}</dt><dd>{receipt.locale === "fil" ? "Filipino" : "English"}</dd></dl>
      {eligible && <Link className="button button-primary" href="/reports/new">{copy.continue}</Link>}
    </div> : !declined && <form onSubmit={event => void submit(event)} aria-describedby="consent-disclosure">
      <fieldset disabled={loading || pending || !eligible || notice === "permission" || notice === "changed"}>
        <legend>{copy.title}</legend>
        <label className="consent-check"><input type="checkbox" checked={adult} onChange={event => setAdult(event.target.checked)} aria-invalid={notice === "validation" && !adult} aria-describedby="consent-adult-help" />{copy.adult}</label>
        <p id="consent-adult-help">{copy.adultHelp}</p>
        <label className="consent-check"><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} aria-invalid={notice === "validation" && !agreed} aria-describedby={notice === "validation" ? "consent-error" : undefined} />{copy.agree}</label>
        <button className="button button-primary" type="submit" disabled={pending || loading}>{pending ? copy.pending : copy.submit}</button>
      </fieldset>
    </form>}
    <div className="consent-actions">
      {!receipt && <button type="button" className="button button-quiet" disabled={pending || loading || !statusConfirmed} onClick={() => { setDeclined(current => !current); setAdult(false); setAgreed(false); setNotice(""); }}>{declined ? copy.reconsider : copy.decline}</button>}
      {!loading && <button type="button" className="button button-quiet" disabled={pending} onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>{copy.retry}</button>}
    </div>
  </section>;
}
