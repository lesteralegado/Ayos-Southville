import "server-only";
import { getFirebaseAdmin } from "@/lib/firebase/admin";
import { hasPilotEligibility } from "@/features/auth/session";
import { createEmailDeliveryModule, type EmailDeliveryStore, type EmailJob } from "./email-delivery-module";
import { createResendEmailAdapter } from "./resend-email-adapter";

export function getEmailDeliveryModule() {
  if (process.env.RESEND_SENDER_VERIFIED !== "true") throw new Error("Verified email sender setup is required.");
  const { db, auth } = getFirebaseAdmin();
  const jobs = db.collection("lifecycleEmailJobs");
  const store: EmailDeliveryStore = {
    async listDue(now, limit) {
      // Single-field date query avoids an undeployed composite-index dependency.
      const snapshot = await jobs.where("nextAttemptAt", "<=", now).orderBy("nextAttemptAt").limit(limit).get();
      return snapshot.docs.map(doc => doc.id);
    },
    async claim(id, now, token) {
      return db.runTransaction(async transaction => {
        const ref = jobs.doc(id); const doc = await transaction.get(ref); const job = doc.data() as EmailJob | undefined;
        if (!job || job.status !== "pending" || (job.nextAttemptAt && job.nextAttemptAt > now) || (job.leaseUntil && job.leaseUntil > now)) return null;
        const profile = await transaction.get(db.collection("residentProfiles").doc(job.residentUid));
        if (profile.data()?.deletionPending === true) return null;
        const claimed = { ...job, leaseToken: token, leaseUntil: new Date(Date.parse(now) + 120_000).toISOString(), attempts: (job.attempts ?? 0) + 1, firstAttemptAt: job.firstAttemptAt ?? now };
        transaction.update(ref, claimed); return claimed;
      });
    },
    async savePayload(id, token, payload) {
      await db.runTransaction(async transaction => { const ref = jobs.doc(id); const doc = await transaction.get(ref); if (doc.data()?.leaseToken !== token) throw new Error("Lease changed"); transaction.update(ref, { payload }); });
    },
    async finish(id, token, result) {
      await db.runTransaction(async transaction => {
        const ref = jobs.doc(id); const doc = await transaction.get(ref); if (doc.data()?.leaseToken !== token) throw new Error("Lease changed");
        transaction.update(ref, { ...result, leaseUntil: "", leaseToken: "", nextAttemptAt: result.status === "pending" ? result.nextAttemptAt! : "9999-12-31T00:00:00.000Z", updatedAt: new Date().toISOString() });
      });
    },
  };
  return createEmailDeliveryModule({ store, siteUrl: process.env.APP_SITE_URL ?? "",
    adapter: createResendEmailAdapter({ apiKey: process.env.RESEND_API_KEY ?? "", from: process.env.RESEND_FROM ?? "" }),
    async recipient(job) {
      const preference = (await db.collection("notificationPreferences").doc(job.residentUid).get()).data();
      if (preference?.emailEnabled !== true || preference?.[job.audience === "status" ? "statusUpdates" : "followUpdates"] === false) return null;
      let user;
      try { user = await auth.getUser(job.residentUid); } catch (error) {
        if ((error as { code?: string }).code === "auth/user-not-found") return null;
        throw error;
      }
      if (user.disabled || !user.emailVerified || !user.email || !(await hasPilotEligibility({ uid: user.uid, email: user.email, email_verified: true }))) return null;
      return user.email;
    },
  });
}
