// @vitest-environment node
import { firebaseBoundary } from "./firebase-boundary";

it("leaves every document unchanged when a later queued create fails", async () => {
  const records = new Map<string, Record<string, unknown>>([
    ["reports/one", { status: "Submitted" }],
    ["receipts/existing", { reference: "original" }],
  ]);
  const db = firebaseBoundary(records);
  await expect(db.runTransaction(async transaction => {
    transaction.update(db.collection("reports").doc("one"), { status: "Under review" });
    transaction.create(db.collection("notifications").doc("new"), { message: "Accepted" });
    transaction.create(db.collection("receipts").doc("existing"), { reference: "replacement" });
  })).rejects.toThrow();
  expect((await db.collection("reports").doc("one").get()).data()).toEqual({ status: "Submitted" });
  expect((await db.collection("notifications").doc("new").get()).exists).toBe(false);
  expect((await db.collection("receipts").doc("existing").get()).data()).toEqual({ reference: "original" });
});

it("rejects reads after writes without publishing the pending change", async () => {
  const db = firebaseBoundary(new Map());
  const ref = db.collection("reports").doc("one");
  await expect(db.runTransaction(async transaction => {
    transaction.set(ref, { status: "Submitted" });
    await transaction.get(ref);
  })).rejects.toThrow("Reads must precede writes");
  expect((await ref.get()).exists).toBe(false);
});

it("serializes competing transactions and remains usable after a failed commit", async () => {
  const db = firebaseBoundary(new Map([["counters/one", { count: 0 }]]));
  const ref = db.collection("counters").doc("one");
  await expect(db.runTransaction(async transaction => {
    transaction.create(ref, { count: 99 });
  })).rejects.toThrow();
  const increment = () => db.runTransaction(async transaction => {
    const count = Number((await transaction.get(ref)).data()?.count);
    transaction.update(ref, { count: count + 1 });
  });
  await Promise.all([increment(), increment()]);
  expect((await ref.get()).data()).toEqual({ count: 2 });
});
