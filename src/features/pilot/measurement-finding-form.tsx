import { useState, type FormEvent } from "react";
import { outcomeFields, type MeasurementRecord, type MeasurementSource } from "./pilot-measurement";
import { measurementCopy } from "./measurement-copy";
export function MeasurementFindingForm({ records, pending, locale, save }: { records: MeasurementRecord[]; pending: boolean; locale: "en" | "fil"; save(input: Record<string, unknown>): Promise<void> }) {
  const copy = measurementCopy[locale], [selection, setSelection] = useState("");
  const selected = records.find(record => `${record.source}-${record.participantCode}` === selection);
  const [source, setSource] = useState<MeasurementSource>("exercise");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    await save({ participantCode: String(data.get("code")), source: selected?.source ?? source, expectedRevision: selected?.revision ?? 0, consentConfirmed: data.get("consent") === "on", ...Object.fromEntries(outcomeFields.map(field => [field, data.get(field) === "null" ? null : data.get(field) === "true"])) });
  }
  return <section id="findings" className="admin-section"><h2>{copy.record}</h2><p>{copy.consentHelp}</p>
    <label>{copy.existing}<select disabled={pending} value={selection} onChange={event => setSelection(event.target.value)}><option value="">{copy.fresh}</option>{records.map(record => <option key={`${record.source}-${record.participantCode}`} value={`${record.source}-${record.participantCode}`}>{record.participantCode} · {copy[record.source]}</option>)}</select></label>
    <form key={selection} onSubmit={event => void submit(event)}><fieldset disabled={pending}><legend>{copy.record}</legend>
      <div className="admin-emergency-grid"><label>{copy.code}<input name="code" required pattern="P[0-9]{2,4}" maxLength={5} readOnly={!!selected} defaultValue={selected?.participantCode ?? ""} /></label><label>{copy.source}<select value={selected?.source ?? source} disabled={!!selected} onChange={event => setSource(event.target.value as MeasurementSource)}>{(["exercise", "real", "unknown"] as const).map(value => <option key={value} value={value}>{copy[value]}</option>)}</select></label></div>
      {(selected?.source ?? source) === "real" && <label className="admin-check"><input type="checkbox" name="consent" required defaultChecked={selected?.consentConfirmed ?? false} />{copy.consent}</label>}
      <div className="admin-emergency-grid">{outcomeFields.map(field => <label key={field}>{copy[field]}<select name={field} defaultValue={selected?.[field] === null || selected?.[field] === undefined ? "null" : String(selected[field])}><option value="null">{copy.uncollected}</option><option value="true">{copy.yes}</option><option value="false">{copy.no}</option></select></label>)}</div>
      <button className="button button-primary" type="submit">{copy.save}</button>
    </fieldset></form>
  </section>;
}
