import "server-only";
import { assertWritable, protectMutation } from "./firebase-protection";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { createPilotMeasurement, type PilotMeasurementStore } from "./pilot-measurement";
import type { PilotSession } from "./pilot-release";
function store(): PilotMeasurementStore { const db=getFirebaseAdmin().db; return { async save(session, actor){await protectMutation(actor.uid,"operator"); await db.runTransaction(async transaction=>{await assertWritable(transaction,actor.uid,[],["Administrator"]); transaction.set(db.collection("pilotMeasurements").doc(session.participantCode),session);});}, async list(){const snapshot=await db.collection("pilotMeasurements").get(); return snapshot.docs.map((document)=>document.data() as PilotSession);} }; }
export function getPilotMeasurement(){return createPilotMeasurement(store());}
