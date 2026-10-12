import { createAdministrationModule, createMemoryAdministrationStore } from './administration-module';

it('records independent intake and invitation pauses with revision protection', async () => {
  const actor = { uid: 'admin', roles: ['Administrator'] as const };
  const admin = { ...actor, roles: [...actor.roles] };
  const administration = createAdministrationModule({ store: createMemoryAdministrationStore({ users: [{ ...admin, emailVerified: true }] }) });
  const initial = await administration.getOperations(admin);
  await administration.updateOperations(admin, { expectedRevision: initial.revision, operations: { ...initial, intakePaused: true, explanation: { en: 'Operator coverage is unavailable.', fil: 'Walang operator na available.' } }, recoveryConfirmed: false });
  expect(await administration.getOperations(admin)).toMatchObject({ revision: 1, intakePaused: true, invitationsPaused: false });
  await expect(administration.updateOperations(admin, { expectedRevision: 0, operations: initial, recoveryConfirmed: true })).rejects.toMatchObject({ code: 'CONFLICT' });
  await administration.setInvitation(admin, { email: 'neighbor@example.test', active: true, reason: 'Participant requested access' });
});

it('requires affirmed coverage and recovery confirmation to resume, without claiming demonstrated acceptance', async () => {
  const admin = { uid: 'admin', roles: ['Administrator'] as ('Administrator')[], emailVerified: true };
  const administration = createAdministrationModule({ store: createMemoryAdministrationStore({ users: [admin, { uid: 'backup', roles: ['Coordinator'], emailVerified: true }, { uid: 'resident', roles: ['Resident'], access: 'approved' }] }) });
  const initial = await administration.getOperations(admin);
  await administration.updateOperations(admin, { expectedRevision: 0, operations: { ...initial, intakePaused: true, invitationsPaused: true, explanation: { en: 'Coverage is unavailable.', fil: 'Walang operator na available.' } }, recoveryConfirmed: false });
  await expect(administration.setInvitation(admin, { email: 'neighbor@example.test', active: true, reason: 'Joined' })).rejects.toMatchObject({ code: 'INVITATIONS_PAUSED' });
  const paused = await administration.getOperations(admin);
  expect(await administration.canEnroll({ uid: 'resident', emailVerified: true })).toBe(true);
  await expect(administration.updateOperations(admin, { expectedRevision: 1, operations: { ...paused, intakePaused: false }, recoveryConfirmed: false })).rejects.toMatchObject({ code: 'VALIDATION' });
  await administration.updateOperations(admin, { expectedRevision: 1, operations: { ...paused, intakePaused: false, primaryUid: 'admin', backupUid: 'backup', backupAffirmed: true }, recoveryConfirmed: true });
  expect(await administration.getOperations(admin)).toMatchObject({ intakePaused: false, invitationsPaused: true, backupAffirmed: true });
  await expect(administration.updateOperations({ uid: 'backup', roles: ['Coordinator'] }, { expectedRevision: 2, operations: paused, recoveryConfirmed: true })).rejects.toMatchObject({ code: 'FORBIDDEN' });
});
