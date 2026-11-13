"use client";
import { useId, useState } from "react";

export function OperatorUpdateFields({ locale, labels, initial = { en: "", fil: "" } }: { locale: "en" | "fil"; labels: { english: string; filipino: string }; initial?: { en: string; fil: string } }) {
  const id = useId(), [update, setUpdate] = useState(initial);
  const required = !update.en.trim() && !update.fil.trim();
  return <div>
    <p>{locale === "fil" ? "Sumulat sa English o Filipino. Opsyonal ang salin. Hanggang 1,000 character bawat wika." : "Write in English or Filipino. A translation is optional. Up to 1,000 characters per language."}</p>
    <label htmlFor={`${id}-en`}>{labels.english}</label><textarea id={`${id}-en`} name="en" required={required} maxLength={1000} value={update.en} onChange={event => setUpdate(current => ({ ...current, en: event.target.value }))} />
    <label htmlFor={`${id}-fil`}>{labels.filipino}</label><textarea id={`${id}-fil`} name="fil" required={required} maxLength={1000} value={update.fil} onChange={event => setUpdate(current => ({ ...current, fil: event.target.value }))} />
  </div>;
}
