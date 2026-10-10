import {
  createAdministrationModule,
  createMemoryAdministrationStore,
} from "./administration-module";
const admin = { uid: "admin", roles: ["Administrator"] as const };
it("invites a verified resident and immediately denies revoked access", async () => {
  const administration = createAdministrationModule({
    store: createMemoryAdministrationStore({
      users: [
        { uid: "admin", roles: ["Administrator"] },
        { uid: "resident", roles: ["Resident"] },
      ],
    }),
  });
  const resident = {
    uid: "resident",
    email: "neighbor@example.test",
    emailVerified: true,
  };
  expect(await administration.canParticipate(resident)).toBe(false);
  await administration.setInvitation(admin, {
    email: "Neighbor@example.test",
    active: true,
    reason: "Invited pilot tester",
  });
  expect(await administration.canParticipate(resident)).toBe(true);
  await administration.setAccess(admin, {
    uid: resident.uid,
    access: "revoked",
    reason: "Resident left the pilot",
  });
  expect(await administration.canParticipate(resident)).toBe(false);
  expect(await administration.listAudit(admin)).toHaveLength(2);
});

it("preserves legacy operator roles and denies unverified and revoked participants", async () => {
  const administration = createAdministrationModule({
    store: createMemoryAdministrationStore({
      users: [
        { uid: "admin", roles: ["Resident", "Administrator"] },
        { uid: "resident", roles: ["Resident"] },
      ],
    }),
  });
  expect(
    await administration.canParticipate({ uid: "admin", emailVerified: true }),
  ).toBe(true);
  expect(
    await administration.canParticipate({ uid: "admin", emailVerified: false }),
  ).toBe(false);
  await administration.setAccess(admin, {
    uid: "resident",
    access: "approved",
    reason: "Joined",
  });
  expect(
    await administration.canParticipate({
      uid: "resident",
      emailVerified: true,
    }),
  ).toBe(true);
  await administration.setAccess(admin, {
    uid: "resident",
    access: "revoked",
    reason: "Left",
  });
  expect(
    await administration.canParticipate({
      uid: "resident",
      emailVerified: true,
    }),
  ).toBe(false);
  await expect(
    administration.setInvitation(
      { uid: "resident", roles: ["Resident"] },
      { email: "other@example.test", active: true, reason: "Bypass" },
    ),
  ).rejects.toMatchObject({ code: "FORBIDDEN" });
  expect(
    (await administration.listUsers(admin)).find((user) => user.uid === "admin")
      ?.roles,
  ).toEqual(["Resident", "Administrator"]);
});

it("revokes an email invitation without granting access to unregistered or unverified users", async () => {
  const administration = createAdministrationModule({
    store: createMemoryAdministrationStore({
      users: [{ uid: "resident", roles: ["Resident"] }],
    }),
  });
  await administration.setInvitation(admin, {
    email: "neighbor@example.test",
    active: true,
    reason: "Invited",
  });
  expect(
    await administration.canParticipate({
      uid: "resident",
      email: "neighbor@example.test",
      emailVerified: false,
    }),
  ).toBe(false);
  expect(
    await administration.canParticipate({
      uid: "missing",
      email: "neighbor@example.test",
      emailVerified: true,
    }),
  ).toBe(false);
  await administration.setInvitation(admin, {
    email: "neighbor@example.test",
    active: false,
    reason: "Revoked",
  });
  expect(
    await administration.canParticipate({
      uid: "resident",
      email: "neighbor@example.test",
      emailVerified: true,
    }),
  ).toBe(false);
});
