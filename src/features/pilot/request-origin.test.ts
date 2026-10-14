// @vitest-environment node
import { isSameOrigin } from './request-origin';

afterEach(() => vi.unstubAllEnvs());
function localRequest(origin = 'http://127.0.0.1:3001', host = '127.0.0.1:3001') {
  return new Request('http://localhost:3001/api/session', { headers: { origin, host } });
}
function isolated() {
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_EMULATORS', 'true');
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'demo-ayos-southville-local');
  vi.stubEnv('NODE_ENV', 'development'); vi.stubEnv('VERCEL', '');
  vi.stubEnv('APP_SITE_URL', 'http://127.0.0.1:3001');
}
it('accepts the actual isolated loopback browser origin despite Next dev URL rewriting', () => {
  isolated(); expect(isSameOrigin(localRequest())).toBe(true);
});
it('refuses cross-origin and mismatched host requests in emulator mode', () => {
  isolated();
  expect(isSameOrigin(localRequest('https://attacker.test'))).toBe(false);
  expect(isSameOrigin(localRequest(undefined, 'attacker.test'))).toBe(false);
});
it.each(['production', 'hosted', 'cloud-project', 'disabled'])('refuses the loopback exception in %s', mode => {
  isolated();
  if (mode === 'production') vi.stubEnv('NODE_ENV', 'production');
  if (mode === 'hosted') vi.stubEnv('VERCEL', '1');
  if (mode === 'cloud-project') vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'live');
  if (mode === 'disabled') vi.stubEnv('NEXT_PUBLIC_FIREBASE_EMULATORS', 'false');
  expect(isSameOrigin(localRequest())).toBe(false);
});
it('retains strict hosted same-origin behavior and rejects missing origins', () => {
  expect(isSameOrigin(new Request('https://ayos.test/api/session', { headers: { origin: 'https://ayos.test' } }))).toBe(true);
  expect(isSameOrigin(new Request('https://ayos.test/api/session'))).toBe(false);
  expect(isSameOrigin(new Request('https://ayos.test/api/session', { headers: { origin: 'https://attacker.test' } }))).toBe(false);
});
