import "server-only";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
export async function pilotRecordsExpired() {
  const value = (await getFirebaseAdmin().db.collection("pilotOperations").doc("current").get()).data()?.pilotEndedAt;
  const end = Date.parse(value ?? "");
  return Number.isFinite(end) && Date.now() >= end + 90 * 86400000;
}
export async function pilotParticipationClosed() {
  const end = Date.parse((await getFirebaseAdmin().db.collection("pilotOperations").doc("current").get()).data()?.pilotEndedAt ?? "");
  return Number.isFinite(end) && Date.now() >= end;
}
