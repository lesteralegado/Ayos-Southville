import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const root = process.cwd(), base = "http://127.0.0.1:4183";
const tile = await sharp({ create: { width: 256, height: 256, channels: 3, background: "#ebe5d7" } }).png().toBuffer();
const server = spawn(process.execPath, [path.join(root,"node_modules/next/dist/bin/next"), "start", "--port", "4183", "--hostname", "127.0.0.1"], { cwd: root, windowsHide: true, stdio: "ignore" });
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { ready = (await fetch(base, { signal: AbortSignal.timeout(1500) })).ok; } catch { /* Wait only for our local server. */ }
    if (server.exitCode !== null) break;
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve,250));
  }
  assert.ok(ready, "Built Next.js server did not become ready");
  let executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath();
  if (!executablePath && process.platform === "win32") {
    const cache = path.join(process.env.LOCALAPPDATA,"ms-playwright"), installed = (await readdir(cache)).filter(name => /^chromium-/.test(name)).sort().at(-1);
    if (installed) executablePath = path.join(cache,installed,"chrome-win","chrome.exe");
  }
  browser = await chromium.launch({ headless:true, executablePath, args:["--enable-unsafe-swiftshader"] });
  const page = await browser.newPage(), errors = [], workers = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => { if (/maplibre-gl-worker[^/]*\.mjs/.test(response.url())) workers.push(response.status()); });
  await page.route("**/api/public-reports**", route => route.fulfill({ json: {
    mode:"live", total:1, page:1, pages:1, categories:[{id:"streetlights",active:true,label:{en:"Lighting",fil:"Ilaw"}}],
    reports:[{reference:"AS-ABC123",category:"streetlights",publicSummary:"Production-bundle fixture",publicArea:"Public court",status:"Assigned",submittedAt:"2026-10-10T00:00:00Z",publicLocation:{latitude:14.28,longitude:121.13},media:[],timeline:[]}],
  } }));
  await page.route("https://tile.openstreetmap.org/**", route => route.fulfill({ contentType:"image/png",body:tile }));
  await page.goto(base + "/?view=map");
  await page.getByRole("heading",{name:"Production-bundle fixture"}).waitFor();
  await page.locator(".maplibregl-canvas").waitFor();
  await page.waitForFunction(() => document.querySelectorAll(".public-map-marker").length === 1);
  await page.getByText("Loading map…",{exact:true}).waitFor({state:"hidden"});
  await page.waitForLoadState("networkidle");
  assert.equal(await page.getByText(/The map is unavailable/).count(),0);
  assert.ok(workers.length > 0 && workers.every(status => status === 200),"Hashed production worker assets must load successfully");
  assert.deepEqual(errors,[]);
  console.log("Built Next.js hydration, lazy MapLibre rendering and hashed worker assets passed with intercepted synthetic API/tile responses. No Firebase data read or written by the browser smoke check.");
} finally { await browser?.close(); server.kill(); }
