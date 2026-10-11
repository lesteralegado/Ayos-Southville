import "server-only";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { getPublicPilotConfiguration } from "@/features/admin/firebase-administration-store";
import { createDiscoveryModule, discoveryLimit, DiscoveryError } from "./discovery-module";
import { publicProjection, type DiscoveryMode } from "./public-projection";

export function discoveryMode(): DiscoveryMode {
  if (process.env.DEMO_MODE !== "true") return "live";
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production")
    throw new DiscoveryError("UNAVAILABLE", 503);
  return "demo";
}
export function publicCollection() { return discoveryMode() === "demo" ? "demoPublicReports" : "publicReports"; }
export function getDiscoveryModule() {
  const mode = discoveryMode();
  return createDiscoveryModule({ mode, async read() {
    const snapshot = await getFirebaseAdmin().db.collection(publicCollection()).where("approved", "==", true).limit(discoveryLimit + 1).get();
    return snapshot.docs.map((doc) => ({ ...doc.data(), reference: doc.id }));
  } });
}
export async function getDiscoveryCategories() {
  const configuration = await getPublicPilotConfiguration();
  return configuration.categories.map(({ id, label, active }) => ({ id, label: { en: label.en, fil: label.fil }, active }));
}
/** No private payload is returned. Redirects terminate only at a currently approved public report. */
export async function getPublicCanonicalReference(reference: string) {
  if (!/^AS-[A-Z0-9]+$/.test(reference) || discoveryMode() !== "live") return null;
  const db = getFirebaseAdmin().db, seen = new Set<string>();
  let current = reference;
  for (let depth = 0; depth < 8 && !seen.has(current); depth++) {
    seen.add(current);
    if (current !== reference) {
      const target = await db.collection("publicReports").doc(current).get();
      if (publicProjection({ ...target.data(), reference: current })) return current;
    }
    const source = (await db.collection("privateReports").doc(current).get()).data();
    if (source?.status !== "Duplicate" || typeof source.canonicalReference !== "string" || !/^AS-[A-Z0-9]+$/.test(source.canonicalReference)) break;
    current = source.canonicalReference;
  }
  return null;
}
