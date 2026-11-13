"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function ResolutionResponse({ reference, fil, revision }: { reference: string; fil: boolean; revision: number }) {
  const router = useRouter(); const locked = useRef(false);
  const [reason, setReason] = useState(""); const [error, setError] = useState<"forbidden" | "conflict" | "network" | "">("");
  const [pending, setPending] = useState(false); const [done, setDone] = useState<"confirm" | "dispute" | "">("");
  const t = (en: string, translated: string) => fil ? translated : en;
  async function respond(response: "confirm" | "dispute") {
    if (locked.current) return;
    locked.current = true; setPending(true); setError("");
    try {
      const result = await fetch("/api/moderation", { method: "PATCH", signal: AbortSignal.timeout(20_000), headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "respond-to-resolution", input: { reference, expectedRevision: revision, response, reason } }) });
      if (!result.ok) { setError([401,403].includes(result.status) ? "forbidden" : result.status === 409 ? "conflict" : "network"); return; }
      setDone(response); router.refresh();
    } catch { setError("network"); }
    finally { locked.current = false; setPending(false); }
  }
  return <section className="engagement-panel resolution-panel" aria-labelledby="resolution-response-title">
    <h2 id="resolution-response-title">{t("Did the resolution work?", "Gumana ba ang resolusyon?")}</h2>
    <p>{t("Only the original reporter can respond. Your reason stays private to authorized operators; only the outcome appears on the public timeline.", "Ang orihinal na nagsumite lamang ang maaaring tumugon. Pribado sa awtorisadong operator ang iyong dahilan; resulta lamang ang lalabas sa pampublikong timeline.")}</p>
    {!done && <><label htmlFor="resolution-reason">{t("Reason (3–4,000 characters)", "Dahilan (3–4,000 character)")}</label><textarea id="resolution-reason" value={reason} onChange={event => setReason(event.target.value)} disabled={pending} required minLength={3} maxLength={4000} aria-describedby="resolution-help" />
    <p id="resolution-help">{t("Explain what you observed. If the problem remains, the report returns to review with its evidence and history preserved.", "Ipaliwanag ang iyong napansin. Kung may problema pa rin, ibabalik sa pagsusuri ang ulat at pananatilihin ang ebidensya at kasaysayan nito.")}</p>
    <div className="engagement-actions"><button className="button button-dark" type="button" disabled={pending || reason.trim().length < 3 || !!error} onClick={() => void respond("confirm")}>{t("Confirmed fixed", "Kinumpirmang ayos na")}</button><button className="button button-quiet" type="button" disabled={pending || reason.trim().length < 3 || !!error} onClick={() => void respond("dispute")}>{t("Still a problem", "May problema pa rin")}</button></div></>}
    <p role="status" aria-live="polite">{pending ? t("Saving your response…", "Sine-save ang iyong tugon…") : done === "confirm" ? t("Resolution confirmed. Your response was saved.", "Nakumpirma ang resolusyon. Na-save ang iyong tugon.") : done === "dispute" ? t("Your dispute was saved. The report is back under review.", "Na-save ang iyong pagtutol. Muling sinusuri ang ulat.") : ""}</p>
    {error && <div role="alert" className="form-alert"><p>{error === "forbidden" ? t("Only the approved original reporter can respond. Check your signed-in account.", "Ang aprubadong orihinal na nagsumite lamang ang maaaring tumugon. Suriin ang account na naka-sign in.") : error === "conflict" ? t("The report changed. Reload its current status before responding.", "Nagbago ang ulat. I-reload ang kasalukuyang status bago tumugon.") : t("Your response could not be confirmed. Your reason is kept. Reload the report before retrying.", "Hindi makumpirma ang iyong tugon. Napanatili ang dahilan. I-reload ang ulat bago subukan muli.")}</p><button className="button button-quiet" type="button" onClick={() => { setError(""); router.refresh(); }}>{t("Retry", "Subukang muli")}</button></div>}
  </section>;
}
