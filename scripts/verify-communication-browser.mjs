import assert from "node:assert/strict";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { createServer, transformWithOxc } from "vite";
const root = process.cwd(), artifacts = path.join(root, ".scratch/ayos-southville-production-completion/artifacts");
await mkdir(artifacts, { recursive: true });
const capture = !process.argv.includes("--functional-only");
const resolutionOnly = process.argv.includes("--resolution-only");
const fixture = `
import React,{useEffect,useState} from 'react';import {createRoot} from 'react-dom/client';
import {NotificationCenter} from '/src/features/reports/notification-center.tsx';import {ReportDetail} from '/src/features/reports/report-detail.tsx';import '/src/app/globals.css';
function App(){const [data,setData]=useState(null);const ref=location.pathname.split('/')[2];useEffect(()=>{if(!ref)return;const reload=()=>fetch('/api/fixture-report?reference='+ref).then(r=>r.json()).then(setData);reload();addEventListener('fixture-refresh',reload);return()=>removeEventListener('fixture-refresh',reload)},[ref]);return ref?data?<ReportDetail report={data.report} canRespond={data.canRespond}/>:<p role="status">Loading report…</p>:<NotificationCenter/>}createRoot(document.getElementById('root')).render(<App/>);`;
let boundaries;
const server = await createServer({ cacheDir: path.join(root, "node_modules/.vite", "verify-communication-browser"), root, configFile: false, server: { watch: { ignored: ["**/.next/**", "**/.next-local/**", "**/.scratch/**"] }, host: "127.0.0.1", port: 4181, strictPort: true }, resolve: { alias: { "@": path.join(root, "src") } }, oxc: { jsx: { runtime: "automatic" } }, define: { "process.env": "{}" }, optimizeDeps: { exclude: ["next/link", "next/navigation"] }, plugins: [{ name: "communication-verification", enforce: "pre",
  resolveId(id) { if (["/__communication.jsx", "next/link", "next/navigation"].includes(id)) return "\0" + id; },
  async load(id) {
    if (id === "\0next/link") return "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}";
    if (id === "\0next/navigation") return "export const useRouter=()=>({refresh:()=>dispatchEvent(new Event('fixture-refresh'))});";
    if (id === "\0/__communication.jsx") return (await transformWithOxc(fixture, "fixture.tsx", { lang: "tsx", jsx: { runtime: "automatic" } })).code;
  },
  configureServer(vite) {
    async function setup() {
      if (boundaries) return boundaries;
      const domain = await vite.ssrLoadModule("/src/features/reports/moderation-module.ts"), engagementDomain = await vite.ssrLoadModule("/src/features/reports/engagement-module.ts");
      const seed = reference => ({ reference, reporterUid: "resident", category: "streetlights", description: "Private identity 09171234567", nearbyLandmark: "Court", evidence: [], status: "Resolved", approved: true, revision: 4, submittedAt: "2026-10-10T02:00:00Z", public: { summary: "Streetlight repaired near the court", area: "Covered court", media: [] }, followers: ["neighbor"], affectedResidents: [], supportingEvidence: [], resolutionEvidence: [{ id: "proof", name: "proof.jpg", type: "image/jpeg", size: 500, visibility: "restricted" }], history: [{ action: "resolved", status: "Resolved", occurredAt: "2026-10-11T02:00:00Z", update: { en: "Light repaired and tested.", fil: "Naayos at nasubukan ang ilaw." } }] });
      const store = domain.createMemoryModerationStore({ reports: [seed("AS-400001"), seed("AS-400002")] });
      const engagementStore = engagementDomain.createMemoryEngagementStore(), engagement = engagementDomain.createEngagementModule({ store: engagementStore });
      const commit = store.commit;
      store.commit = async change => { await commit(change); for (const notice of change.notifications) { const preferences = await engagement.getPreferences(notice.residentUid); if (!preferences.statusUpdates) continue; const id = crypto.randomUUID(); await engagementStore.addNotificationOnce(id, { ...notice, id, kind: "report-update", read: false }); } };
      const initial = { id: crypto.randomUUID(), residentUid: "resident", reference: "AS-400001", kind: "report-update", message: "Light repaired.", update: { en: "Light repaired. Tell us whether the resolution worked.", fil: "Naayos ang ilaw. Sabihin kung gumana ang resolusyon." }, read: false, createdAt: "2026-10-11T02:00:00Z" };
      await engagementStore.addNotificationOnce("initial", initial);
      boundaries = { moderation: domain.createModerationModule({ store }), engagement, domain, store }; return boundaries;
    }
    vite.middlewares.use(async (req, res, next) => {
      if (req.url === "/" || req.url.startsWith("/reports/")) { res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html lang="en"><head><title>Resident communication verification</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@vite/client"></script><script type="module" src="/__communication.jsx"></script></body></html>'); return; }
      if (!req.url.startsWith("/api/")) return next();
      const { moderation, engagement, store } = await setup(), uid = req.headers["x-fixture-uid"] || "resident";
      try {
        const url = new URL(req.url, "http://127.0.0.1:4181"), chunks = []; for await (const chunk of req) chunks.push(chunk);
        const input = chunks.length ? JSON.parse(Buffer.concat(chunks)) : {}; let result;
        if (url.pathname === "/api/notifications") {
          if (req.method === "PATCH") { if (input.notificationId) await engagement.markNotificationRead(uid, input.notificationId); else await engagement.setPreferences(uid, input.preferences); result = { ok: true }; }
          else result = { notifications: await engagement.listNotifications(uid), preferences: await engagement.getPreferences(uid) };
        } else if (url.pathname === "/api/fixture-report") {
          const report = await store.getReport(url.searchParams.get("reference"));
          result = { report: { revision: report.revision, reference: report.reference, category: report.category, publicSummary: report.public.summary, publicArea: report.public.area, media: [], status: report.status, submittedAt: report.submittedAt, timeline: report.history.map(event => ({ status: event.status, occurredAt: event.occurredAt, update: event.update })) }, canRespond: uid === report.reporterUid };
        } else if (url.pathname === "/api/moderation") { await moderation.respondToResolution({ uid, roles: ["Resident"] }, input.input); result = { ok: true }; }
        else if (url.pathname === "/api/engagement") result = { state: await engagement.getResidentState(uid, url.searchParams.get("reference")) };
        else throw new Error("Unknown fixture route");
        res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(result));
      } catch (error) { res.statusCode = error.code === "FORBIDDEN" ? 403 : error.code === "CONFLICT" ? 409 : 422; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ error: error.message })); }
    });
  },
}] });
let browser;
try {
  await server.listen(); let executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath();
  if (!executablePath && process.platform === "win32") { const cache = path.join(process.env.LOCALAPPDATA, "ms-playwright"), installed = (await readdir(cache)).filter(name => /^chromium-/.test(name)).sort().at(-1); if (installed) executablePath = path.join(cache, installed, "chrome-win", "chrome.exe"); }
  browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ reducedMotion: "reduce" }), errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://127.0.0.1:4181/"); await page.getByRole("button", { name: "Mark read" }).waitFor();
  async function inspect(surface) {
    if (!capture || (resolutionOnly && surface !== "resolution")) return;
    for (const [device, width, height] of [["desktop",1440,1000],["tablet",768,1024],["mobile",390,844]]) {
      await page.setViewportSize({ width,height }); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), surface + device + " overflow");
      await page.screenshot({ path: path.join(artifacts, `communication-${surface}-${device}.png`), fullPage: true });
      await page.addScriptTag({ path: path.join(root,"node_modules/axe-core/axe.min.js") });
      const violations = await page.evaluate(async () => (await window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa","wcag22aa"]}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.failureSummary)})));
      assert.deepEqual(violations,[],surface + device + " accessibility");
    }
  }
  await inspect("inbox"); await page.getByLabel("Language").selectOption("fil"); await page.getByRole("heading", { name: "Mga abiso", exact: true }).waitFor();
  if (capture && !resolutionOnly) await page.screenshot({ path: path.join(artifacts,"communication-inbox-filipino.png"),fullPage:true });
  await page.getByLabel("Wika").selectOption("en");
  await page.keyboard.press("Tab"); assert.ok(await page.evaluate(() => document.activeElement !== document.body));
  await page.evaluate(() => document.documentElement.style.fontSize="200%"); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),"text zoom"); await page.evaluate(() => document.documentElement.style.fontSize="");
  await page.getByRole("button", { name:"Mark read" }).click(); await page.getByText("Notification marked read.").waitFor();
  await page.getByLabel("Email important updates",{exact:true}).click(); await page.getByText("Preferences saved.").waitFor();
  await page.reload(); await page.getByLabel("Email important updates",{exact:true}).waitFor(); assert.equal(await page.getByLabel("Email important updates",{exact:true}).isChecked(),true);
  await page.route("**/api/notifications",route=>route.abort("failed")); await page.getByRole("button",{name:"Reload notifications"}).click(); await page.getByRole("alert").waitFor(); await page.unroute("**/api/notifications"); await page.getByRole("button",{name:"Reload notifications"}).click(); await page.getByRole("alert").waitFor({state:"hidden"});
  await page.getByRole("link",{name:"View report AS-400001"}).click(); await page.getByRole("button",{name:"Confirm resolution"}).waitFor(); await inspect("resolution");
  await page.getByLabel("Reason (3–4,000 characters)").fill("The streetlight works normally now."); await page.getByRole("button",{name:"Confirm resolution"}).click(); await page.getByText("Resident confirmed",{exact:true}).first().waitFor();
  await page.goto("http://127.0.0.1:4181/reports/AS-400002"); await page.getByLabel("Reason (3–4,000 characters)").fill("Private phone 09171234567; light still flickers.");
  await page.route("**/api/moderation",route=>route.abort("failed")); await page.getByRole("button",{name:"Problem remains"}).click(); await page.getByRole("alert").waitFor(); assert.match(await page.getByLabel("Reason (3–4,000 characters)").inputValue(),/still flickers/); await page.unroute("**/api/moderation"); await page.reload(); await page.getByLabel("Reason (3–4,000 characters)").fill("Private phone 09171234567; light still flickers."); await page.getByRole("button",{name:"Problem remains"}).click(); await page.getByText("Under review",{exact:true}).first().waitFor();
  const neighbor = await browser.newPage({extraHTTPHeaders:{"x-fixture-uid":"neighbor"}}); await neighbor.goto("http://127.0.0.1:4181/reports/AS-400001"); await neighbor.getByRole("heading",{name:"Streetlight repaired near the court"}).waitFor(); assert.equal(await neighbor.getByRole("button",{name:"Confirm resolution"}).count(),0);
  const forbidden = await neighbor.request.patch("http://127.0.0.1:4181/api/moderation",{data:{action:"respond-to-resolution",input:{reference:"AS-400001",expectedRevision:4,response:"confirm",reason:"Looks fine."}}}); assert.equal(forbidden.status(),403);
  const stale = await page.request.patch("http://127.0.0.1:4181/api/moderation",{data:{action:"respond-to-resolution",input:{reference:"AS-400002",expectedRevision:4,response:"dispute",reason:"Old request."}}}); assert.equal(stale.status(),409);
  const report = await boundaries.moderation.getPrivateReport({uid:"operator",roles:["Administrator"]},"AS-400002"); assert.equal(report.resolutionEvidence.length,1); assert.equal(report.history.length,2); assert.ok(!JSON.stringify(await boundaries.moderation.getPublicReport("AS-400002")).includes("09171234567")); assert.deepEqual(errors,[]);
  console.log("Resident inbox/read state/preferences persistence, reporter confirmation/dispute, private reason, forbidden reporter, stale conflict, and network recovery passed. " + (capture?"Responsive captures, axe, keyboard, reduced motion and text zoom passed.":"Functional-only confirmation."));
} finally { await browser?.close(); await server.close(); }
