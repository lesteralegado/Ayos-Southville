import type { Locale } from "@/features/i18n/messages";

export const navigationCopy = {
  en: { unread: "Unread updates", primary: "Primary navigation", community: "Community reports", report: "Report a concern", mine: "My reports", operations: "Report operations", account: "Account", signIn: "Sign in", advanced: "Advanced settings", tools: "Advanced pilot tools", insights: "Insights", pilot: "Pilot and release evidence", privacy: "Privacy policy", description: "Coverage, safety, privacy, and pilot tools." },
  fil: { unread: "May hindi pa nababasang update", primary: "Pangunahing nabigasyon", community: "Mga ulat sa komunidad", report: "Mag-ulat ng concern", mine: "Aking mga ulat", operations: "Pamamahala ng mga ulat", account: "Account", signIn: "Mag-sign in", advanced: "Mga advanced na setting", tools: "Mga kasangkapan ng pilot", insights: "Mga resulta", pilot: "Tungkol sa pilot", privacy: "Patakaran sa privacy", description: "Coverage, kaligtasan, privacy, at mga kasangkapan ng pilot." },
} satisfies Record<Locale, Record<string, string>>;

export function canOperateReports(roles: readonly string[]) {
  return roles.some(role => ["Moderator", "Coordinator", "Administrator"].includes(role));
}
