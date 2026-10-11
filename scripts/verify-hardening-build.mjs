import assert from "node:assert/strict";
import path from "node:path";
import { readdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
const base = "http://127.0.0.1:3016";
// Read-only smoke against a locally started production build. No credentials.
for (const [pathname, status, method] of [["/api/privacy",401,"GET"],["/api/operations",401,"GET"],["/api/internal/retention",401,"POST"],["/api/health",503,"GET"]]) {
  const response = await fetch(base + pathname, { method, redirect: "manual" });
  assert.equal(response.status, status, pathname);
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  const value = await response.text(); assert.ok(!/private key|residentUid|reporterUid/i.test(value));
}
for (const pathname of ["/account/privacy","/administration/operations"]) {
  const response = await fetch(base + pathname,{redirect:"manual"});
  assert.ok([200,307].includes(response.status));
  if (response.status === 307) assert.match(response.headers.get("location"),/sign-in/);
  else assert.match(await response.text(),/NEXT_REDIRECT.*sign-in/);
}
let executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
if (!executablePath && process.platform === "win32") { const cache=path.join(process.env.LOCALAPPDATA,"ms-playwright"), installed=(await readdir(cache)).filter(name=>/^chromium-/.test(name)).sort().at(-1); if(installed) executablePath=path.join(cache,installed,"chrome-win","chrome.exe"); }
const browser=await chromium.launch({headless:true,executablePath});
try { const page=await browser.newPage(), errors=[]; page.on("pageerror",error=>errors.push(error.message)); await page.goto(base+"/privacy"); await page.getByRole("heading",{name:"Your privacy, your choice"}).waitFor(); await page.getByLabel("Language").selectOption("fil"); await page.getByRole("heading",{name:"Inyong privacy, inyong pasya"}).waitFor(); assert.deepEqual(errors,[]); console.log("Built Next app: bilingual policy hydration, private-route redirects, worker authentication and missing-configuration health refusal passed."); } finally { await browser.close(); }
