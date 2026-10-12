import "server-only";
import { assertParticipant, assertWritable, protectMutation } from "./firebase-protection";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { createPilotMeasurement, measurementRecord, PilotMeasurementConflictError, PilotMeasurementValidationError, type PilotMeasurementStore, type PilotTrial } from "./pilot-measurement";
function store(): PilotMeasurementStore {
  const db = getFirebaseAdmin().db, trialRef = db.collection("pilotEvaluation").doc("current");
  return {
    async save(record, actor, expectedRevision) {
      await protectMutation(actor.uid, "operator");
      await db.runTransaction(async transaction => {
        await assertWritable(transaction, actor.uid, [], ["Administrator"]);
        await assertParticipant(transaction, actor.uid, false);
        const canonicalRef = db.collection("pilotMeasurements").doc(`${record.source}-${record.participantCode}`), legacyRef = db.collection("pilotMeasurements").doc(record.participantCode);
        const [canonical, legacy, trial] = await transaction.getAll(canonicalRef, legacyRef, trialRef);
        const legacyMatches = record.source === "unknown" && measurementRecord(legacy.data())?.source === "unknown";
        const ref = !canonical.exists && legacyMatches ? legacyRef : canonicalRef, current = !canonical.exists && legacyMatches ? legacy : canonical;
        if ((measurementRecord(current.data())?.revision ?? 0) !== expectedRevision) throw new PilotMeasurementConflictError("Reload current findings before retrying.");
        if (record.source === "real" && !trial.data()?.startedAt) throw new PilotMeasurementValidationError("Record release approval and trial start first.");
        if (record.source === "real" && !current.exists) {
          const participants = await transaction.get(db.collection("pilotMeasurements").where("source", "==", "real").limit(26));
          if (participants.size >= Number(trial.data()?.capacity ?? 10)) throw new PilotMeasurementValidationError("Reviewed participant capacity has been reached.");
        }
        transaction.set(ref, record);
      });
    },
    async list() {
      const snapshot = await db.collection("pilotMeasurements").limit(2001).get();
      if (snapshot.size > 2000) throw new Error("Measurement capacity exceeded.");
      return snapshot.docs.map(document => document.data());
    },
    async trial() { return (await trialRef.get()).data() as PilotTrial ?? null; },
    async saveTrial(trial, actor, expectedRevision) {
      await protectMutation(actor.uid, "operator");
      await db.runTransaction(async transaction => {
        await assertWritable(transaction, actor.uid, [], ["Administrator"]);
        await assertParticipant(transaction, actor.uid, false);
        const current = await transaction.get(trialRef);
        if ((current.data()?.revision ?? 0) !== expectedRevision) throw new PilotMeasurementConflictError("Reload current trial before retrying.");
        transaction.set(trialRef, trial);
      });
    },
  };
}
export function getPilotMeasurement() { return createPilotMeasurement(store()); }
