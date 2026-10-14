import { spawnSync } from 'node:child_process';

for (const name of ['intake', 'operator', 'communication', 'discovery', 'administration', 'consent', 'coverage', 'accountable-review', 'measurement', 'hardening']) {
  const result = spawnSync(process.execPath, ['scripts/verify-' + name + '-browser.mjs'], { stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) {
    console.error('Demonstration verification stopped at ' + name + '.');
    process.exit(result.status ?? 1);
  }
}
console.log('PASS: all synthetic demonstration browser suites. Run verify:local-demo separately against running local emulators and app; human phone usability remains pending.');
