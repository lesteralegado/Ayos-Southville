import assert from "node:assert/strict";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { createServer, transformWithOxc } from "vite";
const root = process.cwd(), artifacts = path.join(root, ".scratch/ayos-southville-production-completion/artifacts");
await mkdir(artifacts, { recursive: true });
const capture = !process.argv.includes("--functional-only");
const fixture = `import React from 'react';import {createRoot} from 'react-dom/client';import {PrivacyWorkspace} from '/src/features/pilot/privacy-workspace.tsx';import '/src/app/globals.css';createRoot(document.getElementById('root')).render(<PrivacyWorkspace mode={location.pathname.slice(1)||'resident'}/>);`;
let privacy, requests = new Map(), runs = [], ended = null;
const server = await createServer({ cacheDir: path.join(root, "node_modules/.vite", "verify-hardening-browser"), root, configFile: false, server: { watch: { ignored: ["**/.next/**", "**/.next-local/**", "**/.scratch/**"] }, host: "127.0.0.1", port: 4186, strictPort: true }, resolve: { alias: { "@": path.join(root, "src") } }, oxc: { jsx: { runtime: "automatic" } }, define: { "process.env": "{}" }, optimizeDeps: { exclude: ["next/link"] }, plugins: [{ name: "hardening-verification", enforce: "pre",
  resolveId(id) { if (["/__hardening.jsx", "next/link"].includes(id)) return "\0" + id; },
  async load(id) {
    if (id === "\0next/link") return "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}";
    if (id === "\0/__hardening.jsx") return (await transformWithOxc(fixture, "fixture.tsx", { lang: "tsx", jsx: { runtime: "automatic" } })).code;
  },
  configureServer(vite) { vite.middlewares.use(async (req, res, next) => {
    if (["/resident", "/administrator", "/policy"].includes(req.url)) { res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html lang="en"><head><title>Privacy verification</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@vite/client"></script><script type="module" src="/__hardening.jsx"></script></body></html>'); return; }
    if (!req.url.startsWith("/api/")) return next();
    if (!privacy) { const { createPrivacyModule } = await vite.ssrLoadModule("/src/features/pilot/privacy-module.ts"); privacy = createPrivacyModule({ store: { async mine(uid) { return requests.get(uid) ?? null; }, async list() { return [...requests.values()]; }, async requestOnce(value) { if (!requests.has(value.residentUid)) requests.set(value.residentUid, value); return requests.get(value.residentUid); }, async decide(id, status) { const found = [...requests.values()].find(value => value.id === id); if (!found) throw new Error("Missing request"); found.status = status; } } }); }
    try {
      const chunks = []; for await (const chunk of req) chunks.push(chunk); const input = chunks.length ? JSON.parse(Buffer.concat(chunks)) : {};
      const actor = { uid: "operator", roles: ["Administrator"] }; let result;
      if (req.url === "/api/privacy") { if (req.method === "POST") await privacy.request("fictional-resident", input.confirmed); result = { request: await privacy.mine("fictional-resident") }; }
      else { if (req.method === "POST") { if (input.action === "review") await privacy.decide(actor, input.id, input.status); else if (input.action === "preview-cleanup") runs.unshift({ mode: "dry-run", occurredAt: new Date().toISOString(), eligible: 2, removed: 0, status: "complete" }); else if (input.action === "pilot-end") ended = new Date(input.date).toISOString(); } result = { requests: await privacy.list(actor), pilotEndedAt: ended, cleanupEnabled: false, runs }; }
      res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(result));
    } catch (error) { res.statusCode = error.status ?? 422; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ code: error.code ?? "VALIDATION" })); }
  }); },
}] });
let browser;
try {
  await server.listen(); let executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath();
  if (!executablePath && process.platform === "win32") { const cache = path.join(process.env.LOCALAPPDATA, "ms-playwright"), installed = (await readdir(cache)).filter(name => /^chromium-/.test(name)).sort().at(-1); if (installed) executablePath = path.join(cache, installed, "chrome-win", "chrome.exe"); }
  browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ reducedMotion: "reduce" }), errors = []; page.on("pageerror", error => errors.push(error.message));
  const base = "http://127.0.0.1:4186";
  async function inspect(surface) { if (!capture) return; for (const [device, width, height] of [["desktop",1440,1000],["tablet",768,1024],["mobile",390,844]]) { await page.setViewportSize({width,height}); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), surface + device + " overflow"); await page.screenshot({path:path.join(artifacts,`hardening-${surface}-${device}.png`),fullPage:true}); await page.addScriptTag({path:path.join(root,"node_modules/axe-core/axe.min.js")}); const violations = await page.evaluate(async () => (await window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa","wcag22aa"]}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)}))); assert.deepEqual(violations,[],surface+device+" accessibility"); } }
  await page.goto(base+"/resident"); await page.getByText("No deletion request yet.",{exact:false}).waitFor();
  const submit = page.getByRole("button",{name:"Request account and data deletion",exact:true}); assert.equal(await submit.isEnabled(),false);
  await inspect("resident"); await page.getByLabel("Language").selectOption("fil"); await page.getByRole("heading",{name:"Inyong privacy, inyong pasya"}).waitFor(); await inspect("resident-fil"); await page.getByLabel("Wika").selectOption("en");
  await page.keyboard.press("Tab"); assert.ok(await page.evaluate(()=>document.activeElement!==document.body)); await page.evaluate(()=>document.documentElement.style.fontSize="200%"); assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),"zoom overflow"); await page.evaluate(()=>document.documentElement.style.fontSize="");
  await page.getByRole("checkbox").check(); await page.route("**/api/privacy",route=>route.abort("failed")); await submit.click(); await page.getByRole("alert").waitFor(); assert.equal(await page.getByRole("checkbox").isChecked(),true); await page.unroute("**/api/privacy"); await submit.click(); await page.getByText("Requested",{exact:true}).waitFor(); assert.equal(requests.size,1); await page.reload(); await page.getByText("Requested",{exact:true}).waitFor();
  await page.goto(base+"/administrator"); await page.getByRole("button",{name:"Approve deletion",exact:true}).waitFor(); await inspect("administrator");
  await page.getByRole("button",{name:"Approve deletion",exact:true}).click(); await page.getByText("Approved for cleanup",{exact:true}).waitFor(); await page.getByRole("button",{name:"Preview cleanup (no deletion)"}).click(); await page.getByText("Dry-run",{exact:true}).waitFor(); assert.equal(runs[0].removed,0);
  await page.getByLabel("Pilot end date",{exact:true}).fill("2026-10-01"); await page.getByRole("checkbox").check(); await page.getByRole("button",{name:"Record end and stop participation"}).click(); await page.getByText("Recorded pilot end",{exact:false}).waitFor();
  await page.route("**/api/operations",route=>route.fulfill({status:403,contentType:"application/json",body:JSON.stringify({code:"FORBIDDEN"})})); await page.getByRole("button",{name:"Reload private status"}).click(); await page.getByRole("alert").waitFor(); assert.equal(await page.getByRole("button",{name:"Preview cleanup (no deletion)"}).isEnabled(),false); await page.unroute("**/api/operations");
  await page.goto(base+"/policy"); await page.getByRole("heading",{name:"Your privacy, your choice"}).waitFor(); assert.ok(!(await page.locator("body").innerText()).includes("fictional-resident")); await inspect("policy"); assert.deepEqual(errors,[]);
  console.log("Privacy request persistence, confirmation, administrator review, non-destructive preview, end-state, permission denial, offline retry, bilingual responsive/axe/keyboard/zoom/reduced-motion checks passed.");
} finally { await browser?.close(); await server.close(); }
