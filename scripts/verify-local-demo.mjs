import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

// Fixed loopback targets only. Start with local:emulators, local:seed and local:app.
// This writes synthetic consent, reports and photos to the disposable local project.
const base = 'http://127.0.0.1:3001';
const hub = await fetch('http://127.0.0.1:4400/emulators', { signal: AbortSignal.timeout(5000) });
assert.ok(hub.ok, 'Start the local emulators first.');
const services = await hub.json();
for (const [name, port] of [['auth', 9099], ['firestore', 8080], ['storage', 9199]]) {
  assert.equal(services[name]?.host, '127.0.0.1');
  assert.equal(services[name]?.port, port);
}
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath() });
const contexts = [];
async function json(context, endpoint, method = 'GET', data, expected = 200) {
  const response = await context.request.fetch(base + endpoint, { method, data, headers: { origin: base }, timeout: 120000 });
  assert.equal(response.status(), expected, method + ' ' + endpoint + ' failed');
  return response.json();
}
async function signIn(name) {
  const response = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-emulator-not-a-real-key', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'local-' + name + '@example.test', password: 'LocalTestOnly-2026!', returnSecureToken: true }),
  });
  assert.ok(response.ok, 'Seed local accounts first.');
  const { idToken, localId } = await response.json();
  assert.equal(localId, 'local-' + name);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  contexts.push(context);
  await json(context, '/api/session', 'POST', { idToken });
  return context;
}
const photo = await sharp({ create: { width: 80, height: 80, channels: 3, background: '#1f674b' } }).jpeg().toBuffer();
async function upload(context, draftKey) {
  const response = await context.request.post(base + '/api/evidence', {
    headers: { origin: base }, multipart: { draftKey, slotId: crypto.randomUUID(), photo: { name: 'synthetic-test.jpg', mimeType: 'image/jpeg', buffer: photo } }, timeout: 120000,
  });
  assert.equal(response.status(), 201, 'Protected local photo upload failed');
  return (await response.json()).asset;
}
try {
  const resident = await signIn('resident'), operator = await signIn('owner'), backup = await signIn('backup');
  const publicContext = await browser.newContext(); contexts.push(publicContext);
  const participation = await json(resident, '/api/participation');
  await json(resident, '/api/participation', 'POST', { version: participation.version, adultAcknowledged: true, consent: true, locale: 'en' });
  await json(operator, '/api/participation', 'POST', { version: participation.version, adultAcknowledged: true, consent: true, locale: 'en' });
  const description = 'SYNTHETIC TEST: streetlight concern; private contact 09171234567.';
  const draftKey = crypto.randomUUID();
  const asset = await upload(resident, draftKey);
  const submission = { idempotencyKey: draftKey, category: 'streetlights', description, nearbyLandmark: 'Synthetic covered court', evidence: [asset], isEmergency: false, confirmNonEmergency: true, confirmPublicSummary: true };
  const receipt = await json(resident, '/api/reports', 'POST', submission, 201);
  const retried = await json(resident, '/api/reports', 'POST', submission);
  assert.equal(retried.reference, receipt.reference); assert.equal(retried.created, false);
  const mine = await json(resident, '/api/reports');
  assert.equal(mine.reports.filter(report => report.reference === receipt.reference).length, 1);
  const unreadPhoto = await publicContext.request.get(base + '/api/public-evidence/' + asset.id);
  assert.equal(unreadPhoto.status(), 404, 'Unapproved evidence must remain private');
  const denied = await publicContext.request.get(base + '/api/evidence/' + asset.id);
  assert.equal(denied.status(), 401);
  async function current() { return (await json(operator, '/api/moderation?reference=' + receipt.reference)).report; }
  async function act(action, input) {
    const report = await current(); assert.ok(report);
    await json(operator, '/api/moderation', 'PATCH', { action, input: { reference: receipt.reference, expectedRevision: report.revision ?? 0, ...input } });
  }
  assert.equal((await json(backup, '/api/moderation?reference=' + receipt.reference)).report.reference, receipt.reference);
  await act('accept', { publicSummary: 'SYNTHETIC TEST: streetlight near a covered court.', publicArea: 'Synthetic court', approvedMedia: [], reason: 'Synthetic local workflow exercise.', update: { en: 'Test report accepted for review.', fil: 'Tinanggap ang pansubok na ulat para sa pagsusuri.' } });
  await act('transition', { to: 'In progress', update: { en: 'Synthetic test work started.', fil: 'Nagsimula ang pansubok na gawain.' } });
  async function resolve() {
    const proof = await upload(operator, 'resolution_' + receipt.reference);
    await act('transition', { to: 'Resolved', resolutionEvidence: [proof], update: { en: 'Synthetic resolution exercise completed; no real repair claimed.', fil: 'Natapos ang pagsasanay sa resolusyon; walang inaangking tunay na pagkukumpuni.' } });
    assert.equal((await publicContext.request.get(base + '/api/public-evidence/' + proof.id)).status(), 404);
  }
  await resolve();
  const page = await resident.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(base + '/reports/' + receipt.reference);
  await page.getByRole('button', { name: 'Still a problem' }).waitFor();
  await page.getByLabel(/Reason/).fill('Synthetic test: the issue remains.');
  await page.getByRole('button', { name: 'Still a problem' }).click();
  await page.getByRole('button', { name: 'Still a problem' }).waitFor({ state: 'hidden' });
  await page.getByText('Under review', { exact: true }).first().waitFor();
  await act('transition', { to: 'In progress', update: { en: 'Second test started.', fil: 'Nagsimula ang ikalawang pagsubok.' } });
  await resolve(); await page.reload();
  await page.getByRole('button', { name: 'Confirmed fixed' }).waitFor();
  await page.getByLabel(/Reason/).fill('Synthetic test: resolution confirmed.');
  await page.getByRole('button', { name: 'Confirmed fixed' }).click();
  await page.getByRole('button', { name: 'Confirmed fixed' }).waitFor({ state: 'hidden' });
  await page.getByText('Confirmed fixed', { exact: true }).first().waitFor();
  await page.reload(); await page.getByText('Confirmed fixed', { exact: true }).first().waitFor();
  assert.equal((await current()).status, 'Resident confirmed');
  const publicPage = await publicContext.newPage();
  await publicPage.goto(base + '/reports/' + receipt.reference);
  await publicPage.getByRole('heading', { name: 'SYNTHETIC TEST: streetlight near a covered court.' }).waitFor();
  assert.ok(!(await publicPage.locator('body').innerText()).includes('09171234567'));
  assert.equal(await publicPage.getByRole('button', { name: 'Confirmed fixed' }).count(), 0);
  assert.ok((await json(resident, '/api/notifications')).notifications.some(notice => notice.reference === receipt.reference));
  const rejected = await json(resident, '/api/reports', 'POST', { ...submission, idempotencyKey: crypto.randomUUID(), evidence: [] }, 201);
  const queued = (await json(operator, '/api/moderation?reference=' + rejected.reference)).report;
  await json(operator, '/api/moderation', 'PATCH', { action: 'reject', input: { reference: rejected.reference, expectedRevision: queued.revision ?? 0, category: 'out-of-scope', reason: 'Synthetic test concern is outside the pilot categories.' } });
  await page.goto(base + '/reports/' + rejected.reference);
  await page.getByText('Synthetic test concern is outside the pilot categories.', { exact: false }).waitFor();
  assert.ok(!(await page.locator('body').innerText()).includes('until it is approved'));
  const artifacts = '.scratch/simplified-product-flow/artifacts';
  await mkdir(artifacts, { recursive: true });
  for (const [device, width] of [['mobile', 390], ['desktop', 1440]]) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: artifacts + '/local-rejected-' + device + '.png', fullPage: true });
  }
  await page.evaluate(() => { localStorage.setItem('ayos-locale', 'fil'); dispatchEvent(new Event('ayos-locale-change')); });
  await page.getByRole('heading', { name: 'Kasaysayan ng ulat' }).waitFor();
  await page.getByText('Pribadong resibo. Sa iyo at awtorisadong operator lamang nakikita ang ulat. Hindi ito nakikita ng publiko.', { exact: true }).waitFor();
  const rejectedPublic = await publicContext.request.get(base + '/reports/' + rejected.reference);
  assert.equal(rejectedPublic.status(), 404);
  assert.deepEqual(errors, []);
  console.log('PASS: connected LOCAL Auth/session, consent, protected photo Storage, idempotent submission, persisted operator lifecycle, resident UI dispute/confirm/reload, notifications and public privacy. Synthetic data only; human usability and deployed readiness remain separate.');
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
