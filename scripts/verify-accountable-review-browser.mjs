import assert from "node:assert/strict";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { createServer, transformWithOxc } from "vite";
const root = process.cwd(), output = path.join(root, ".impeccable/review/accountable");
await mkdir(output, { recursive: true });
const fixture = `
import React from "react";import {createRoot} from "react-dom/client";
import {OperatorWorkspace} from "/src/features/reports/operator-workspace.tsx";
import {OperatingControls} from "/src/features/admin/operating-controls.tsx";
import {ResidentReportList} from "/src/features/reports/resident-report-list.tsx";
import {createModerationModule,createMemoryModerationStore} from "/src/features/reports/moderation-module.ts";
import {defaultPilotOperations} from "/src/features/admin/pilot-operations.ts";
import "/src/app/globals.css";
const actor={uid:"synthetic-backup",roles:["Administrator"]};
const seed={reference:"AS-SYNTHETIC",reporterUid:"synthetic-resident",category:"streetlights",description:"Synthetic streetlight exercise, not a real report.",nearbyLandmark:"Synthetic court",evidence:[],status:"Submitted",submittedAt:"2026-10-30T01:00:00Z",public:{summary:"Synthetic safe concern",area:"Synthetic court",media:[]},followers:[],affectedResidents:[],supportingEvidence:[],history:[]};
const operations={...defaultPilotOperations,primaryUid:"synthetic-primary",backupUid:actor.uid,backupAffirmed:true,reviewCalendar:{from:"2026-10-01",through:"2026-12-31",holidays:["2026-11-02"],source:"Synthetic owner-confirmed fixture, not a real calendar",ownerConfirmed:true}};
const module=createModerationModule({store:createMemoryModerationStore({reports:[seed]}),now:()=>new Date("2026-11-04T11:00:01Z"),operations:async()=>operations});
window.__module=module;
window.fetch=async(url,options={})=>{
 if(String(url)!=="/api/moderation")throw Error("Unexpected synthetic request");
 if(options.method==="PATCH"){
   const {action,input}=JSON.parse(options.body);
   const method={"take-over-review":"takeOverReview","acknowledge-review":"acknowledgeReview","external-follow-up":"recordExternalFollowUp"}[action];
   try{await module[method](actor,input);}catch(error){return Response.json({error:error.message,code:error.code},{status:422});}
   if(window.__loseAck)throw TypeError("Synthetic acknowledgement lost after commit");
   return Response.json({ok:true});
 }
 return Response.json({reports:await module.listWorkspace(actor)});
};
const query=new URLSearchParams(location.search),view=query.get("view");
const reports=await module.listWorkspace(actor);
const node=view==="calendar"?<main className="admin-page"><div className="admin-shell"><h1>Synthetic calendar verification</h1><OperatingControls confirmed={defaultPilotOperations} users={[]} pending={false} locale={query.get("fil")?"fil":"en"} save={async()=>{}}/></div></main>
 :view==="resident"?<ResidentReportList reports={[{...seed,reviewExpectation:{dueAt:query.get("unknown")?null:"2026-11-04T11:00:00.000Z",acknowledgedAt:null}}]}/>
 :<OperatorWorkspace initialReports={reports} actor={actor} destinations={[]}/>;
createRoot(document.getElementById("root")).render(node);
`;
const server = await createServer({ root, configFile: false, server: { host: "127.0.0.1", port: 4191, strictPort: true }, optimizeDeps: { exclude: ["next/link", "next/navigation"] }, resolve: { alias: { "@": path.join(root, "src") } }, oxc: { jsx: { runtime: "automatic" } }, define: { "process.env": "{}" }, plugins: [{name:"accountable-fixture",enforce:"pre",
 resolveId(id){if(["/__review.jsx","next/link","next/navigation"].includes(id))return "\0"+id;},
 async load(id){if(id==="\0next/link")return "import React from 'react';export default function Link({children,...p}){return React.createElement('a',p,children)}";if(id==="\0next/navigation")return "export const useRouter=()=>({push:()=>{},refresh:()=>{}})";if(id==="\0/__review.jsx")return(await transformWithOxc(fixture,"fixture.tsx",{lang:"tsx",jsx:{runtime:"automatic"}})).code;},
 configureServer(vite){vite.middlewares.use((req,res,next)=>{if(!req.url.startsWith("/?")&&req.url!=="/")return next();res.setHeader("Content-Type","text/html");res.end('<!doctype html><html lang="en"><head><title>Synthetic accountable review</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script>window.process={env:{NODE_ENV:"development"}}</script><script type="module" src="/@vite/client"></script><script type="module" src="/__review.jsx"></script></body></html>');});}
 }] });
let browser;
try {
 await server.listen();let executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
 if(!executablePath&&process.platform==="win32"){const entries=await readdir(path.join(process.env.LOCALAPPDATA,"ms-playwright"));const installed=entries.filter(n=>/^chromium-/.test(n)).sort().at(-1);if(installed)executablePath=path.join(process.env.LOCALAPPDATA,"ms-playwright",installed,"chrome-win","chrome.exe");}
 browser=await chromium.launch({executablePath,headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on("pageerror",e=>{errors.push(e.message);console.error(e.message);});
 async function capture(name,width=390,forced=false){await page.setViewportSize({width,height:900});await page.emulateMedia({reducedMotion:"reduce",forcedColors:forced?"active":"none"});await page.evaluate(()=>scrollTo(0,0));assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+" overflow");await page.screenshot({path:path.join(output,name+".png"),fullPage:true});await page.addScriptTag({path:path.join(root,"node_modules/axe-core/axe.min.js")});assert.deepEqual(await page.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations.map(v=>v.id)),[],name+" axe");}
 await page.goto("http://127.0.0.1:4191/");await page.getByRole("heading",{name:"Accountable review"}).waitFor();
 await capture("operator-desktop",1440);await capture("operator-tablet",768);await capture("operator-mobile");await capture("operator-zoom400",360);await capture("operator-forced-colors",360,true);
 await page.emulateMedia({forcedColors:"none"});await page.keyboard.press("Tab");assert.ok(await page.evaluate(()=>document.activeElement!==document.body));
 await page.getByRole("button",{name:"Filipino",exact:true}).click();await capture("operator-filipino");await page.getByRole("button",{name:"English",exact:true}).click();
 await page.evaluate(()=>{window.__loseAck=true;});await page.getByLabel(/I reviewed both updates/).check();await page.getByRole("button",{name:"Accept backup takeover and send delay update"}).click();await page.getByRole("alert").waitFor();assert.ok(await page.getByRole("button",{name:"Record actual acknowledgement"}).isDisabled());await capture("operator-offline");
 await page.evaluate(()=>{window.__loseAck=false;});await page.getByRole("button",{name:"Reload workspace"}).click();await page.getByText("Latest reports loaded. Review the current state before retrying.",{exact:true}).waitFor();await capture("operator-takeover");assert.equal(await page.evaluate(async()=>(await window.__module.listNotifications("synthetic-resident")).length),1);
 await page.getByLabel("Private next-step decision",{exact:true}).fill("Synthetic next step: inspect evidence and choose an internal desk.");await page.getByRole("button",{name:"Record actual acknowledgement"}).click();await page.getByText(/Review acknowledged:/).waitFor();
 await page.getByLabel("Outside organization · private").fill("Synthetic outside organization");await page.getByLabel("Correspondence or response · private").fill("Synthetic private correspondence; no real contact made.");await page.getByRole("button",{name:"Save private follow-up"}).click();await page.getByRole("heading",{name:"Private follow-up history"}).waitFor();await capture("operator-follow-up");
 assert.equal(await page.evaluate(async()=>(await window.__module.getPrivateReport({uid:"synthetic-backup",roles:["Administrator"]},"AS-SYNTHETIC")).status),"Submitted");
 await page.goto("http://127.0.0.1:4191/?view=calendar");await page.getByRole("heading",{name:/Review holiday calendar/}).waitFor();await capture("calendar-desktop",1440);await capture("calendar-mobile");await page.getByLabel("Non-working holiday dates · one YYYY-MM-DD per line").fill("2026-11-02\n2026-11-30");assert.equal(await page.getByLabel("Non-working holiday dates · one YYYY-MM-DD per line").inputValue(),"2026-11-02\n2026-11-30");
 await page.goto("http://127.0.0.1:4191/?view=calendar&fil=1");await page.getByRole("heading",{name:/Holiday calendar ng review/}).waitFor();await capture("calendar-filipino");
 await page.goto("http://127.0.0.1:4191/?view=resident");await page.getByText("Review target",{exact:true}).waitFor();await capture("resident-mobile");await page.goto("http://127.0.0.1:4191/?view=resident&unknown=1");await page.getByText(/Review deadline not yet confirmed/).waitFor();await capture("resident-unknown");
 assert.deepEqual(errors,[]);console.log("PASS: synthetic accountable review, lost acknowledgement/reload, one delay notice, private contact/lifecycle separation; EN/FIL, responsive/equivalent400 reflow, keyboard, forced colors, reduced motion, axe. Not production or human AT evidence.");
} finally {await browser?.close();await server.close();}
