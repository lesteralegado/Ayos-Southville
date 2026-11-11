import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { createServer, transformWithOxc } from "vite";

const root = process.cwd(), artifacts = path.join(root, ".scratch/architecture-health/artifacts");
await mkdir(artifacts, { recursive: true });
const fixture = `
import React from 'react';import {createRoot} from 'react-dom/client';
import {OperatorWorkspace} from '/src/features/reports/operator-workspace.tsx';
import {ResidentReportList} from '/src/features/reports/resident-report-list.tsx';
import {createModerationModule,createMemoryModerationStore} from '/src/features/reports/moderation-module.ts';
import {createReportModule,createMemoryReportStore} from '/src/features/reports/report-module.ts';
import {defaultPilotOperations} from '/src/features/admin/pilot-operations.ts';
import '/src/app/globals.css';
const actor={uid:'operator',roles:['Administrator']},date='2026-11-02T00:00:00.000Z';
const items=Array.from({length:121},(_,index)=>({reference:'AS-PAGE'+String(index).padStart(6,'0'),reporterUid:'resident',category:'streetlights',description:'Synthetic private concern '+index,nearbyLandmark:'Synthetic court',evidence:[],status:index===0?'Under review':'Submitted',submittedAt:date,approved:index===0,public:{summary:'Synthetic canonical concern',area:'Synthetic court',media:[]},followers:[],affectedResidents:[],supportingEvidence:[],history:[],...(index>=21?{review:{acknowledgedAt:date,nextStep:'Synthetic reviewed',actorUid:'operator'}}:{})}));
const moderation=createModerationModule({store:createMemoryModerationStore({reports:items}),now:()=>new Date('2026-11-06T00:00:00Z'),operations:async()=>({...defaultPilotOperations,reviewCalendar:{from:'2026-11-01',through:'2026-11-30',holidays:[],source:'Synthetic',ownerConfirmed:true}})});
let index=0;const reports=createReportModule({store:createMemoryReportStore(),now:()=>new Date(date),nextReference:()=>items[index++].reference});
for(const item of items)await reports.submit({residentUid:'resident',idempotencyKey:'synthetic-draft-'+item.reference,category:item.category,description:item.description+' streetlight reporting exercise',nearbyLandmark:item.nearbyLandmark,evidence:[],isEmergency:false,confirmNonEmergency:true,confirmPublicSummary:true});
window.fetch=async(input,options={})=>{if(window.__offline)throw TypeError('Synthetic offline');const url=new URL(String(input),location.origin),params=url.searchParams;
 if(url.pathname==='/api/reports')return Response.json(await reports.listMinePage('resident',params.get('cursor')));
 if(url.pathname!=='/api/moderation')throw Error('Unexpected fixture request');
 if(options.method==='PATCH'){const body=JSON.parse(options.body);if(body.action!=='merge')throw Error('Unexpected action');await moderation.merge(actor,body.input);return Response.json({ok:true});}
 return Response.json(params.has('reference')?{report:await moderation.getPrivateReport(actor,params.get('reference'))}:await moderation.listWorkspacePage(actor,{filter:params.get('filter')??'active',cursor:params.get('cursor')}));};
const resident=new URL(location.href).searchParams.has('resident');
const page=resident?await reports.listMinePage('resident'):await moderation.listWorkspacePage(actor,{filter:'active'});
const detail=!resident&&page.reports[0]?await moderation.getPrivateReport(actor,page.reports[0].reference):null;
createRoot(document.getElementById('root')).render(resident?<ResidentReportList reports={page.reports} nextCursor={page.nextCursor}/>:<OperatorWorkspace initialReports={page.reports} initialNextCursor={page.nextCursor} initialSelectedReport={detail} actor={actor} destinations={[]}/>);
`;
const server = await createServer({ root, configFile: false, cacheDir: path.join(root, "node_modules/.vite/verify-report-pages"), server: { host: "127.0.0.1", port: 4194, strictPort: true, watch: { ignored: ["**/.scratch/**", "**/.next/**", "**/.next-local/**"] } }, resolve: { alias: { "@": path.join(root, "src") } }, define: { "process.env": "{}" }, oxc: { jsx: { runtime: "automatic" } }, optimizeDeps: { exclude: ["next/link"] }, plugins: [{ name: "report-pages-fixture", enforce: "pre",
  resolveId(id) { if (["/__pages.jsx", "next/link"].includes(id)) return "\0" + id; },
  async load(id) { if (id === "\0next/link") return "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}"; if (id === "\0/__pages.jsx") return (await transformWithOxc(fixture, "fixture.tsx", { lang: "tsx", jsx: { runtime: "automatic" } })).code; },
  configureServer(vite) { vite.middlewares.use((req, res, next) => { if (req.url !== "/" && !req.url.startsWith("/?")) return next(); res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html lang="en"><head><title>Synthetic report page verification</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@vite/client"></script><script type="module" src="/__pages.jsx"></script></body></html>'); }); },
}] });
let browser;
try {
  await server.listen(); browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath() });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  async function capture(name, width) {
    await page.setViewportSize({ width, height: 900 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + " overflow");
    await page.screenshot({ path: path.join(artifacts, name + ".png"), fullPage: true });
    await page.addScriptTag({ path: path.join(root, "node_modules/axe-core/axe.min.js") });
    assert.deepEqual(await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(item => item.id)), [], name + " axe");
  }
  await page.goto("http://127.0.0.1:4194/");
  await page.getByRole("heading", { name: /AS-PAGE000120/ }).waitFor();
  await capture("report-pages-operator-desktop", 1440);
  await page.getByRole("button", { name: "Next reports", exact: true }).click();
  await page.getByRole("heading", { name: /AS-PAGE000100/ }).waitFor();
  await page.getByRole("button", { name: "Start of list" }).click();
  await page.getByLabel("Report status", { exact: true }).selectOption("overdue");
  await page.getByText("No matches in this group. Continue checking older reports.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Continue checking older reports", exact: true }).click();
  await page.getByRole("heading", { name: /AS-PAGE000020/ }).waitFor();
  await page.getByLabel("Report status", { exact: true }).selectOption("active");
  await page.getByRole("heading", { name: /AS-PAGE000120/ }).waitFor();
  await page.getByLabel("Review decision", { exact: true }).selectOption("merge");
  await page.getByLabel("Canonical report", { exact: true }).fill("AS-PAGE000000");
  await page.getByRole("button", { name: "Find canonical report" }).click();
  await page.getByText("AS-PAGE000000: Synthetic canonical concern", { exact: true }).waitFor();
  await page.getByLabel("Decision reason").fill("Synthetic duplicate concern, canonical report on an older page.");
  await page.getByRole("button", { name: "Merge duplicate", exact: true }).click();
  await page.getByRole("heading", { name: /AS-PAGE000120.*Duplicate/ }).waitFor();
  await page.getByRole("button", { name: "Filipino", exact: true }).click();
  await page.getByRole("button", { name: "Susunod na mga ulat" }).waitFor();
  await capture("report-pages-operator-mobile-filipino", 390);
  await page.keyboard.press("Tab"); assert.ok(await page.evaluate(() => document.activeElement !== document.body));
  await page.goto("http://127.0.0.1:4194/?resident=1");
  await page.getByRole("heading", { name: "Aking mga ulat", exact: true }).waitFor();
  await capture("report-pages-resident-mobile-filipino", 390);
  await page.evaluate(() => { localStorage.setItem("ayos-locale", "en"); dispatchEvent(new Event("ayos-locale-change")); window.__offline = true; });
  await page.getByRole("heading", { name: "My reports", exact: true }).waitFor();
  await page.getByRole("button", { name: "Older reports", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Could not load older reports" }).waitFor();
  await page.evaluate(() => { window.__offline = false; });
  await page.getByRole("button", { name: "Older reports", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "40 reports loaded." }).waitFor();
  await capture("report-pages-resident-desktop", 1440);
  assert.deepEqual(errors, []);
  console.log("PASS: bounded pages, empty overdue continuation, older selected details, canonical merge beyond current page, resident retry without lost rows, EN/FIL, desktop/mobile, keyboard, reduced motion and axe. Synthetic browser fixtures; real emulator contracts run separately.");
} finally { await browser?.close(); await server.close(); }
