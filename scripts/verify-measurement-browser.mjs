import assert from "node:assert/strict";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { createServer, transformWithOxc } from "vite";
const root = process.cwd(), output = path.join(root, ".impeccable/review/measurement");
await mkdir(output, { recursive: true });
const fixture = `
import React from "react";import {createRoot} from "react-dom/client";
import {MeasurementWorkspace} from "/src/features/pilot/measurement-workspace.tsx";
import {createPilotMeasurement,createMemoryPilotMeasurementStore} from "/src/features/pilot/pilot-measurement.ts";
import "/src/app/globals.css";
const actor={uid:"synthetic-admin",roles:["Administrator"]},query=new URLSearchParams(location.search);
const measurement=createPilotMeasurement(createMemoryPilotMeasurementStore([{participantCode:"P99",submitted:true,assisted:false}]),{now:()=>new Date("2026-10-19T11:00:00Z")});
window.__measurement=measurement;
window.fetch=async(url,options={})=>{
 if(String(url)!=="/api/pilot-measurement")throw Error("Unexpected synthetic request");
 if(window.__forbidden)return Response.json({code:"FORBIDDEN"},{status:403});
 if(window.__offline)throw TypeError("Synthetic offline request");
 if(options.method==="POST"){
   const input=JSON.parse(options.body),method=input.action==="start-trial"?"startTrial":input.action==="review-trial"?"reviewTrial":"record";
   try{await measurement[method](actor,input);}catch(error){return Response.json({code:error.code},{status:error.code==="CONFLICT"?409:422});}
   if(window.__loseAck)throw TypeError("Synthetic acknowledgement lost after commit");
   return Response.json({ok:true},{status:201});
 }
 if(query.has("loading"))await new Promise(resolve=>setTimeout(resolve,5000));
 return Response.json(await measurement.read(actor));
};
createRoot(document.getElementById("root")).render(<><div className="global-demo-banner" role="status">Synthetic verification only · No live participant or release evidence</div><MeasurementWorkspace/></>);
`;
const server = await createServer({ root, configFile: false, server: { host: "127.0.0.1", port: 4192, strictPort: true }, optimizeDeps: { exclude: ["next/link", "next/navigation"] }, resolve: { alias: { "@": path.join(root, "src") } }, oxc: { jsx: { runtime: "automatic" } }, define: { "process.env": "{}" }, plugins: [{ name: "measurement-fixture", enforce: "pre",
  resolveId(id) { if (["/__measurement.jsx", "next/link", "next/navigation"].includes(id)) return "\0" + id; },
  async load(id) { if (id === "\0next/link") return "import React from 'react';export default function Link({children,...p}){return React.createElement('a',p,children)}"; if (id === "\0next/navigation") return "export const useRouter=()=>({push:()=>{},refresh:()=>{}})"; if (id === "\0/__measurement.jsx") return (await transformWithOxc(fixture, "fixture.tsx", { lang: "tsx", jsx: { runtime: "automatic" } })).code; },
  configureServer(vite) { vite.middlewares.use((req, res, next) => { if (!req.url.startsWith("/?") && req.url !== "/") return next(); res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html lang="en"><head><title>Synthetic measurement verification</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script>window.process={env:{NODE_ENV:"development"}}</script><script type="module" src="/@vite/client"></script><script type="module" src="/__measurement.jsx"></script></body></html>'); }); },
}] });
let browser;
try {
  await server.listen(); let executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  if (!executablePath && process.platform === "win32") { const entries = await readdir(path.join(process.env.LOCALAPPDATA, "ms-playwright")); const installed = entries.filter(name => /^chromium-/.test(name)).sort().at(-1); if (installed) executablePath = path.join(process.env.LOCALAPPDATA, "ms-playwright", installed, "chrome-win", "chrome.exe"); }
  browser = await chromium.launch({ executablePath, headless: true }); const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  async function capture(name, width = 390, forced = false) {
    await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: "reduce", forcedColors: forced ? "active" : "none" }); await page.evaluate(() => scrollTo(0, 0));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + " overflow"); await page.screenshot({ path: path.join(output, name + ".png"), fullPage: true });
    await page.addScriptTag({ path: path.join(root, "node_modules/axe-core/axe.min.js") }); assert.deepEqual(await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(value => value.id)), [], name + " axe");
  }
  await page.goto("http://127.0.0.1:4192/?loading=1"); await page.getByText("Loading private findings…").waitFor(); await capture("loading");
  await page.goto("http://127.0.0.1:4192/"); await page.getByText("Insufficient real sample: collect at least 10 consenting participants.").waitFor();
  await capture("desktop", 1440); await capture("tablet", 768); await capture("mobile"); await capture("zoom400-reflow", 360); await capture("forced-colors", 360, true); await page.emulateMedia({ forcedColors: "none" });
  await page.keyboard.press("Tab"); assert.ok(await page.evaluate(() => document.activeElement !== document.body));
  await page.getByRole("button", { name: "Filipino", exact: true }).click(); await capture("filipino"); await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByLabel("Participant code (P01–P9999)").fill("P01"); await page.getByLabel("Submission").selectOption("false"); await page.getByLabel("Assistance needed").selectOption("true");
  await page.evaluate(() => { window.__loseAck = true; }); await page.getByRole("button", { name: "Save finding", exact: true }).click(); await page.getByRole("alert").waitFor(); assert.ok(await page.getByRole("button", { name: "Save finding" }).isDisabled()); await capture("lost-acknowledgement");
  await page.evaluate(() => { window.__loseAck = false; }); await page.getByRole("button", { name: "Reload findings" }).click(); await page.getByRole("button", { name: "Save finding" }).waitFor(); await page.waitForFunction(() => !document.querySelector("#findings fieldset").disabled);
  await capture("recovered-finding"); assert.equal(await page.evaluate(async () => (await window.__measurement.summary({ uid: "synthetic-admin", roles: ["Administrator"] })).exercise.participants), 1);
  await page.getByLabel("Edit existing finding").selectOption("exercise-P01"); await page.getByLabel("Submission").selectOption("true"); await page.getByRole("button", { name: "Save finding" }).click(); await page.getByText("Saved and confirmed from current records.").waitFor(); assert.equal(await page.evaluate(async () => (await window.__measurement.summary({ uid: "synthetic-admin", roles: ["Administrator"] })).exercise.participants), 1);
  await page.getByLabel("Explicit release approval has been granted").check(); await page.getByLabel(/I reviewed release prerequisites/).check(); await page.getByLabel("Start time · Asia/Manila").fill("2026-10-12T19:00"); await page.getByLabel(/Evidence reference code/).fill("EVID-SYNTHETIC"); await page.getByRole("button", { name: "Record approval and trial start" }).click(); await page.getByRole("button", { name: "Record weekly review" }).waitFor();
  await page.getByLabel("Review week (1–4)").fill("1"); await page.getByLabel("Reviewed decision").selectOption("expand"); await page.getByLabel("Reviewed participant capacity (10–25)").fill("15"); await page.getByLabel(/Evidence reference code/).fill("EVID-SYNTHETIC-W1"); await page.getByRole("button", { name: "Record weekly review" }).click(); await page.getByRole("alert").waitFor(); await capture("validation");
  await page.getByLabel("Safety reviewed", { exact: true }).check(); await page.getByLabel("Coverage reviewed", { exact: true }).check(); await page.getByRole("button", { name: "Record weekly review" }).click(); await page.getByText(/EVID-SYNTHETIC-W1/).waitFor(); await capture("trial-review");
  await page.evaluate(async () => { for (let index = 0; index < 10; index++) await window.__measurement.record({ uid: "synthetic-admin", roles: ["Administrator"] }, { participantCode: "P" + String(index + 1).padStart(2, "0"), source: "real", consentConfirmed: true, expectedRevision: 0, submitted: index < 9, assisted: index === 8, understoodStatus: null, foundDuplicate: false, completedLifecycle: false }); });
  await page.getByRole("button", { name: "Reload findings" }).click(); await page.getByText("Unassisted submission target met for this recorded sample (at least 80%).").waitFor(); await capture("synthetic-real-sample");
  await page.evaluate(() => { window.__offline = true; }); await page.getByRole("button", { name: "Reload findings" }).click(); await page.getByRole("alert").waitFor(); await capture("offline"); assert.ok(await page.getByRole("button", { name: "Save finding" }).isDisabled());
  await page.evaluate(() => { window.__offline = false; window.__forbidden = true; }); await page.getByRole("button", { name: "Reload findings" }).click(); await page.getByText("You cannot access measurement. Sign in with a verified administrator account.").waitFor(); await capture("permission");
  assert.deepEqual(errors, []); console.log("PASS: synthetic measurement record/edit/recovery, provenance and insufficient sample, explicit trial start and reviewed expansion; EN/FIL, responsive/equivalent400 reflow, keyboard, forced colors, reduced motion and axe. Not live provider, release approval or human AT evidence.");
} finally { await browser?.close(); await server.close(); }
