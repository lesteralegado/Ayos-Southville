import "server-only";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { createPilotMeasurement, type PilotMeasurementStore } from "./pilot-measurement";
import type { PilotSession } from "./pilot-release";
function store(): PilotMeasurementStore { const db=getFirebaseAdmin().db; return { async save(session){await db.collection("pilotMeasurements").doc(session.participantCode).set(session);}, async list(){const snapshot=await db.collection("pilotMeasurements").get(); return snapshot.docs.map((document)=>document.data() as PilotSession);} }; }
export function getPilotMeasurement(){return createPilotMeasurement(store());}