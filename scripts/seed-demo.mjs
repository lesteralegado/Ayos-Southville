import { applicationDefault, cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (process.env.DEMO_MODE !== "true" || process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production")
  throw new Error("Demo seeding is permitted only in explicit non-production demo mode.");
const projectId = process.env.DEMO_FIREBASE_PROJECT_ID;
if (!projectId?.endsWith("-demo") || projectId === process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
  throw new Error("Use a separate DEMO_FIREBASE_PROJECT_ID ending in -demo, not the live Firebase project.");
const password = process.env.DEMO_SEED_PASSWORD;
if (!password || password.length < 12) throw new Error("DEMO_SEED_PASSWORD must contain at least 12 characters.");
const credential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) : applicationDefault();
const app = initializeApp({ credential, projectId }, "isolated-demo-seed");
const auth = getAuth(app), db = getFirestore(app);
const roles = ["Resident", "Resident", "Resident", "Resident", "Resident", "Resident", "Resident", "Moderator", "Coordinator", "Administrator"];
for (let index = 0; index < roles.length; index++) {
  const email = `demo${index + 1}@example.invalid`;
  let user;
  try { user = await auth.getUserByEmail(email); }
  catch (error) {
    if (error.code !== "auth/user-not-found") throw error;
    user = await auth.createUser({ email, password, emailVerified: true, displayName: `Demo resident ${index + 1}` });
  }
  await db.collection("residentProfiles").doc(user.uid).set({ publicAlias: `Demo ${index + 1}`, roles: [roles[index]], demonstration: true }, { merge: true });
}
const statuses = ["Under review", "Assigned", "In progress", "Resolved", "Resident confirmed"];
for (let index = 0; index < statuses.length; index++) {
  const reference = `DEMO-${String(index + 1).padStart(3, "0")}`, submittedAt = new Date(Date.now() - (index + 2) * 86_400_000).toISOString(), status = statuses[index];
  const timeline = [{ status: "Under review", occurredAt: new Date(Date.parse(submittedAt) + 3_600_000).toISOString() },
    ...(["Resolved", "Resident confirmed"].includes(status) ? [{ status: "Resolved", occurredAt: new Date(Date.parse(submittedAt) + 86_400_000).toISOString() }] : [])];
  await db.collection("demoPublicReports").doc(reference).set({ reference, approved: true, category: ["roads-drainage", "streetlights", "waste-collection"][index % 3], status,
    submittedAt, publicArea: `Demo public area ${(index % 2) + 1}`, publicLocation: { latitude: 14.28, longitude: 121.13 },
    publicSummary: "Synthetic demonstration concern — not a real resident report.", timeline, demonstration: true, media: [] });
}
console.log("Separate demo project seeded: 10 synthetic users and 5 approved projections in demoPublicReports. No live records written.");
