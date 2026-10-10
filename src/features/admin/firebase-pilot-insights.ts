import "server-only";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { createPilotInsights, type InsightReport } from "./pilot-insights";
export async function getPublicPilotInsights(){const snapshot=await getFirebaseAdmin().db.collection("publicReports").get(); const reports=snapshot.docs.map((doc)=>{const data=doc.data(); return {category:data.category,status:data.status,submittedAt:data.submittedAt,publicArea:data.publicArea,timeline:Array.isArray(data.timeline)?data.timeline:[]} as InsightReport;}); return createPilotInsights(reports);}