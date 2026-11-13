import type { Locale } from "@/features/i18n/messages";
import { presentUpdate } from "./report-presentation";

export function ReportUpdate({ update, locale }: { update: { en: string; fil: string }; locale: Locale }) {
  const message = presentUpdate(update, locale);
  return <span lang={message.lang}>{message.text} <small>({message.label})</small></span>;
}
