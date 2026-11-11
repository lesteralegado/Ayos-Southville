import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Reproduce hosted runtimes that disable CommonJS require(ESM), even on Node 24.
// Real SDK imports and key conversion run without credentials or network access.
const result = spawnSync(process.execPath, ["--no-experimental-require-module", "--input-type=commonjs", "--eval", `
  const assert = require('node:assert/strict');
  const { createRequire } = require('node:module');
  const { generateKeyPairSync, sign, verify } = require('node:crypto');
  const { initializeApp, deleteApp } = require('firebase-admin/app');
  const { getAuth } = require('firebase-admin/auth');
  const { getFirestore } = require('firebase-admin/firestore');
  const { getStorage } = require('firebase-admin/storage');
  const firebaseRequire = createRequire(require.resolve('firebase-admin'));
  const jwksClient = firebaseRequire('jwks-rsa');

  async function main() {
    const app = initializeApp({ projectId: 'demo-runtime-compatibility' });
    try {
      assert.equal(getAuth(app).app, app);
      assert.equal(typeof getFirestore(app).collection, 'function');
      assert.equal(getStorage(app).app, app);
      const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
      const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'synthetic-runtime-key', use: 'sig', alg: 'RS256' };
      const client = jwksClient({ cache: false, getKeysInterceptor: async () => [jwk] });
      const key = await client.getSigningKey(jwk.kid);
      const message = Buffer.from('synthetic runtime compatibility check');
      const signature = sign('RSA-SHA256', message, privateKey);
      assert.equal(verify('RSA-SHA256', message, key.getPublicKey(), signature), true);
      assert.equal(verify('RSA-SHA256', Buffer.from('tampered message'), key.getPublicKey(), signature), false);
      console.log('PASS: Firebase Admin startup and RSA signing-key conversion with require(ESM) disabled.');
    } finally {
      await deleteApp(app);
    }
  }
  main().catch(error => { console.error(error); process.exitCode = 1; });
`], {
  cwd: fileURLToPath(new URL("..", import.meta.url)),
  stdio: "inherit",
  windowsHide: true,
  timeout: 30_000,
});
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
