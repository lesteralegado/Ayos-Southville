import { beforeEach, expect, it, vi } from "vitest";
import {
  createAdministrationModule,
  createMemoryAdministrationStore,
  defaultPilotConfiguration,
} from "@/features/admin/administration-module";
const state = vi.hoisted(() => ({
  actor: vi.fn(),
  administration: null as unknown,
}));
vi.mock("@/features/auth/session", () => ({
  getVerifiedOperator: state.actor,
}));
vi.mock("@/features/admin/firebase-administration-store", () => ({
  getAdministrationModule: () => state.administration,
}));
import { GET, PATCH } from "./route";
const admin = { uid: "admin", roles: ["Administrator"] };
it("rejects a non-string emergency source", async () => {
  const response = await PATCH(request("update-configuration", { reason: "Invalid source", configuration: { ...defaultPilotConfiguration, emergency: { ...defaultPilotConfiguration.emergency, en: { ...defaultPilotConfiguration.emergency.en, sourceUrl: ["https://e911.gov.ph/"] } } } }));
  expect(response.status).toBe(422);
});
const request = (
  action: string,
  input: unknown,
  origin = "https://ayos.test",
) =>
  new Request("https://ayos.test/api/administration", {
    method: "PATCH",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ action, input }),
  });
beforeEach(() => {
  state.administration = createAdministrationModule({
    store: createMemoryAdministrationStore({
      users: [
        { uid: "admin", roles: ["Administrator"], emailVerified: true },
        { uid: "neighbor", roles: ["Resident"] },
      ],
    }),
  });
  state.actor.mockResolvedValue(admin);
});
it("denies a resident access to users, invitations, and audits", async () => {
  state.actor.mockResolvedValue({ uid: "neighbor", roles: ["Resident"] });
  expect((await GET()).status).toBe(403);
  expect(
    (
      await PATCH(
        request("set-access", {
          uid: "neighbor",
          access: "approved",
          reason: "Bypass",
        }),
      )
    ).status,
  ).toBe(403);
});
it("saves and lists invitations with an audit event through the API", async () => {
  expect(
    (
      await PATCH(
        request("set-invitation", {
          email: "neighbor@example.test",
          active: true,
          reason: "Pilot tester",
        }),
      )
    ).status,
  ).toBe(200);
  const response = await GET();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(await response.json()).toMatchObject({
    invitations: [{ email: "neighbor@example.test", active: true }],
    audit: [{ action: "pilot.invited" }],
  });
});
it("rejects cross-origin writes, malformed roles, malformed configuration, and last-admin removal", async () => {
  expect(
    (await PATCH(request("set-access", {}, "https://attacker.test"))).status,
  ).toBe(403);
  expect(
    (
      await PATCH(
        request("set-roles", { uid: "admin", roles: "Administrator" }),
      )
    ).status,
  ).toBe(422);
  expect(
    (await PATCH(request("update-configuration", { configuration: {} })))
      .status,
  ).toBe(422);
  expect(
    (
      await PATCH(
        request("set-roles", {
          uid: "admin",
          roles: ["Resident"],
          reason: "Remove",
        }),
      )
    ).status,
  ).toBe(422);
});

it("rejects numeric identifiers rather than persisting malformed routing", async () => {
  const response = await PATCH(
    request("update-configuration", {
      reason: "Malformed routing",
      configuration: {
        destinations: [{ id: 123, name: "Desk", active: true }],
        categories: [
          {
            id: 456,
            label: { en: "Test", fil: "Pagsubok" },
            destinationId: 123,
            active: true,
          },
        ],
        emergency: {
          en: {
            message: "Call",
            phone: "911",
            sourceUrl: "https://e911.gov.ph/",
          },
          fil: {
            message: "Tumawag",
            phone: "911",
            sourceUrl: "https://e911.gov.ph/",
          },
        },
      },
    }),
  );
  expect(response.status).toBe(422);
});
