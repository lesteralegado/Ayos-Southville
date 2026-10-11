import { expect, it } from "vitest";
import { createPrivacyModule, type DeletionRequest } from "./privacy-module";

it("tracks an idempotent deletion request privately and restricts review to administrators", async () => {
  const requests = new Map<string, DeletionRequest>();
  const service = createPrivacyModule({ now: () => new Date("2026-10-11T00:00:00Z"), store: {
    mine: async uid => requests.get(uid) ?? null,
    list: async () => [...requests.values()],
    requestOnce: async request => { if (!requests.has(request.residentUid!)) requests.set(request.residentUid!, request); return requests.get(request.residentUid!)!; },
    decide: async (id, status) => { for (const request of requests.values()) if (request.id === id && request.status === "requested") request.status = status; },
  } });
  await expect(service.request("resident", false)).rejects.toMatchObject({ status: 422 });
  const first = await service.request("resident", true);
  expect(await service.request("resident", true)).toEqual(first);
  expect(await service.mine("another-resident")).toBeNull();
  await expect(service.list({ uid: "resident", roles: ["Resident"] })).rejects.toMatchObject({ status: 403 });
  await service.decide({ uid: "admin", roles: ["Administrator"] }, first.id, "approved");
  expect((await service.mine("resident"))?.status).toBe("approved");
});
