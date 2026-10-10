import { createAdministrationModule, createMemoryAdministrationStore } from "./administration-module";

const admin = { uid: "admin-1", roles: ["Administrator"] as const };
const resident = { uid: "resident-1", roles: ["Resident"] as const };

describe("pilot administration boundary", () => {
  it("allows administrators to grant and revoke capabilities but preserves a viable administrator", async () => {
    const store = createMemoryAdministrationStore({ users: [{ uid: "admin-1", roles: ["Resident", "Administrator"] }, { uid: "resident-1", roles: ["Resident"] }] });
    const administration = createAdministrationModule({ store, now: () => new Date("2026-10-10T08:00:00.000Z") });
    await expect(administration.setRoles(resident, { uid: "resident-1", roles: ["Moderator"], reason: "Unauthorized." })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(administration.setRoles(admin, { uid: "admin-1", roles: ["Resident"], reason: "Remove myself." })).rejects.toMatchObject({ code: "VALIDATION" });
    await administration.setRoles(admin, { uid: "resident-1", roles: ["Resident", "Administrator"], reason: "Second pilot administrator." });
    await administration.setRoles(admin, { uid: "admin-1", roles: ["Resident"], reason: "Transfer administration." });
    expect(await administration.listUsers(admin)).toEqual(expect.arrayContaining([expect.objectContaining({ uid: "resident-1", roles: ["Resident", "Administrator"] }), expect.objectContaining({ uid: "admin-1", roles: ["Resident"] })]));
    expect(await administration.listAudit(admin)).toHaveLength(2);
  });

  it("validates configurable categories, destinations, and bilingual verified emergency guidance", async () => {
    const administration = createAdministrationModule({ store: createMemoryAdministrationStore({ users: [{ uid: "admin-1", roles: ["Administrator"] }] }) });
    const configuration = { destinations: [{ id: "lighting", name: "Pilot lighting desk", active: true }], categories: [{ id: "streetlights", label: { en: "Streetlights", fil: "Ilaw sa kalsada" }, destinationId: "lighting", active: true }], emergency: { en: { message: "Call 911 now.", phone: "911", sourceUrl: "https://e911.gov.ph/" }, fil: { message: "Tumawag agad sa 911.", phone: "911", sourceUrl: "https://e911.gov.ph/" } } };
    await administration.updateConfiguration(admin, { configuration, reason: "Verified pilot routing." });
    expect(await administration.getConfiguration(admin)).toEqual(configuration);
    await expect(administration.updateConfiguration(admin, { configuration: { ...configuration, emergency: { ...configuration.emergency, fil: { ...configuration.emergency.fil, sourceUrl: "http://unverified.test" } } }, reason: "Unsafe source." })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(administration.updateConfiguration(resident, { configuration, reason: "Unauthorized." })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await administration.listAudit(admin)).toEqual([expect.objectContaining({ action: "pilot.configuration-updated", reason: "Verified pilot routing." })]);
  });});