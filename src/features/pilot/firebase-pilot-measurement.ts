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
        const erased = await transaction.get(db.collection("measurementErasures").doc(`${record.source}-${record.participantCode}`));
        if (erased.exists) throw new PilotMeasurementConflictError("An erased participant code cannot be reused.");
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
    async erase(input, actor) {
      await protectMutation(actor.uid, "operator");
      await db.runTransaction(async transaction => {
        await assertWritable(transaction, actor.uid, [], ["Administrator"]);
        await assertParticipant(transaction, actor.uid, false);
        const ledgerRef = db.collection("measurementErasures").doc(`${input.source}-${input.participantCode}`);
        const canonicalRef = db.collection("pilotMeasurements").doc(`${input.source}-${input.participantCode}`), legacyRef = db.collection("pilotMeasurements").doc(input.participantCode);
        const [ledger, canonical, legacy] = await transaction.getAll(ledgerRef, canonicalRef, legacyRef);
        const matching = [canonical, legacy].filter(document => measurementRecord(document.data())?.source === input.source);
        if (!ledger.exists && (!matching.length || Math.max(...matching.map(document => measurementRecord(document.data())!.revision)) !== input.expectedRevision)) throw new PilotMeasurementConflictError("Reload current findings before erasure.");
        if (!ledger.exists) transaction.set(ledgerRef, { source: input.source, participantCode: input.participantCode, evidenceCode: input.evidenceCode, erasedAt: input.erasedAt, createdAt: input.erasedAt });
        for (const document of matching) transaction.delete(document.ref);
      });
    },
    async list() {
      const [snapshot, ledger] = await Promise.all([db.collection("pilotMeasurements").limit(2001).get(), db.collection("measurementErasures").limit(2001).get()]);
      if (snapshot.size > 2000 || ledger.size > 2000) throw new Error("Measurement capacity exceeded.");
      const erased = new Set(ledger.docs.map(document => document.id));
      return snapshot.docs.map(document => document.data()).filter(value => { const record = measurementRecord(value); return !record || !erased.has(`${record.source}-${record.participantCode}`); });
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
