import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (process.env.DEMO_MODE !== "true") throw new Error("Set DEMO_MODE=true to acknowledge that this writes demonstration data.");
const password = process.env.DEMO_SEED_PASSWORD;
if (!password || password.length < 12) throw new Error("DEMO_SEED_PASSWORD must contain at least 12 characters.");
const credential = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) : applicationDefault();
const app = getApps()[0] ?? initializeApp({ credential, projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
const auth = getAuth(app); const db = getFirestore(app);
const roles = ["Resident","Resident","Resident","Resident","Resident","Resident","Resident","Moderator","Coordinator","Administrator"];
const statuses = ["Submitted","Under review","Assigned","In progress","Resolved","Resident confirmed"];
for (let index=0; index<roles.length; index++) {
  const email=`demo${index+1}@example.invalid`; let user;
  try { user=await auth.getUserByEmail(email); } catch { user=await auth.createUser({email,password,emailVerified:true,displayName:`Demo resident ${index+1}`}); }
  await db.collection("residentProfiles").doc(user.uid).set({displayName:`Demo ${index+1}`,roles:[roles[index]],demonstration:true},{merge:true});
}
for (let index=0; index<statuses.length; index++) {
  const reference=`DEMO-${String(index+1).padStart(3,"0")}`; const submittedAt=new Date(Date.UTC(2026,8,index+1,1)).toISOString(); const status=statuses[index];
  const timeline=[{status:"Submitted",occurredAt:submittedAt},...(status==="Submitted"?[]:[{status:"Under review",occurredAt:new Date(Date.parse(submittedAt)+3600000).toISOString()}]),...(status==="Resolved"||status==="Resident confirmed"?[{status:"Resolved",occurredAt:new Date(Date.parse(submittedAt)+86400000).toISOString()}]:[])];
  await db.collection("publicReports").doc(reference).set({reference,category:["roads-drainage","streetlights","waste-collection"][index%3],status,submittedAt,publicArea:`Phase ${(index%3)+1}`,nearbyLandmark:`Demo landmark ${index+1}`,summary:"Synthetic demonstration concern — not a real resident report.",timeline,demonstration:true,evidence:index%2?[{name:`demo-evidence-${index}.jpg`,visibility:status==="Submitted"?"restricted":"public"}]:[]});
}
console.log("Demonstration seed complete: 10 users and 6 reports. These records are synthetic and labeled demonstration=true.");