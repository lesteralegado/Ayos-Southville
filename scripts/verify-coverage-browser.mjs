import assert from "node:assert/strict";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { createServer, transformWithOxc } from "vite";
const root = process.cwd(), output = path.join(root, ".impeccable/review/coverage");
await mkdir(output, { recursive: true });
const fixture = `
import React, {useState} from "react";
import {createRoot} from "react-dom/client";
import {AdministrationWorkspace} from "/src/features/admin/administration-workspace.tsx";
import {ReportComposer} from "/src/features/reports/report-composer.tsx";
import {createAdministrationModule, createMemoryAdministrationStore} from "/src/features/admin/administration-module.ts";
import "/src/app/globals.css";
const actor = {uid:"primary",roles:["Administrator"]};
const module = createAdministrationModule({store:createMemoryAdministrationStore({users:[
 {uid:"primary",roles:["Administrator"],publicAlias:"Synthetic primary",emailVerified:true},
 {uid:"backup",roles:["Administrator"],publicAlias:"Synthetic backup",emailVerified:true}
]})});
const snapshot=async()=>({users:await module.listUsers(actor),configuration:await module.getConfiguration(actor),invitations:await module.listInvitations(actor),audit:await module.listAudit(actor),operations:await module.getOperations(actor)});
window.fetch=async(url,options={})=>{
 if(String(url)==="/api/administration" && options.method==="PATCH"){
   const {action,input}=JSON.parse(options.body);
   try {
     if(action==="update-operations") await module.updateOperations(actor,input);
     else if(action==="set-invitation") await module.setInvitation(actor,input);
     return Response.json({ok:true});
   }catch(error){return Response.json({code:error.code,error:error.message},{status:error.status||422});}
 }
 if(String(url)==="/api/administration") return Response.json(await snapshot());
 if(String(url)==="/api/pilot-status") return Response.json(await module.getOperations(actor));
 if(String(url)==="/api/reports/receipt?draftKey="+new URL(String(url),"http://fixture.test").searchParams.get("draftKey")) return Response.json({}, {status:404});
 if(String(url)==="/api/reports") {
   if((await module.getOperations(actor)).intakePaused) return Response.json({code:"INTAKE_PAUSED"},{status:409});
   return Response.json({reference:"AS-SYNTHETIC",created:true},{status:201});
 }
 throw new Error("Unexpected fixture request");
};
function Fixture(){
 const [screen,setScreen]=useState("admin"),[data,setData]=useState(null);
 async function show(screen){setData(await snapshot());setScreen(screen);}
 if(!data){show("admin");return <p>Loading synthetic fixture</p>;}
 return <><nav aria-label="Synthetic verification fixture"><button onClick={()=>show("admin")}>Fixture administration</button><button onClick={()=>show("resident")}>Fixture resident</button></nav>{screen==="admin"?<AdministrationWorkspace initial={data}/>:<ReportComposer emergencyGuidance={data.configuration.emergency} operatingStatus={data.operations}/>}</>;
}
createRoot(document.getElementById("root")).render(<Fixture/>);
`;
const server = await createServer({ cacheDir: path.join(root, "node_modules/.vite", "verify-coverage-browser"),
  root, configFile: false, server: { watch: { ignored: ["**/.next/**", "**/.next-local/**", "**/.scratch/**"] }, host: "127.0.0.1", port: 4189, strictPort: true },
  optimizeDeps: { exclude: ["next/link", "next/navigation"] },
  resolve: { alias: { "@": path.join(root, "src") } }, oxc: { jsx: { runtime: "automatic" } }, define: { "process.env": "{}" },
  plugins: [{
    name: "coverage-synthetic-fixture",
    enforce: "pre",
    resolveId(id) { if (["/__coverage.jsx", "next/link", "next/navigation"].includes(id)) return "\0" + id; },
    async load(id) {
      if (id === "\0next/link") return "import React from 'react'; export default function Link({children,...props}){return React.createElement('a',props,children)}";
      if (id === "\0next/navigation") return "export const useRouter=()=>({push:target=>{window.__receipt=target}})";
      if (id === "\0/__coverage.jsx") return (await transformWithOxc(fixture, "fixture.tsx", { lang: "tsx", jsx: { runtime: "automatic" } })).code;
    },
    configureServer(vite) { vite.middlewares.use((req, res, next) => {
      if (req.url !== "/") return next();
      res.setHeader("Content-Type", "text/html");
      res.end('<!doctype html><html lang="en"><head><title>Synthetic coverage verification</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script>window.process={env:{NODE_ENV:"development"}}</script><script type="module" src="/@vite/client"></script><script type="module" src="/__coverage.jsx"></script></body></html>');
    }); },
  }],
});
let browser;
try {
  await server.listen();
  let executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath();
  if (!executablePath && process.platform === "win32") {
    const entries = await readdir(path.join(process.env.LOCALAPPDATA, "ms-playwright"));
    const installed = entries.filter(name => /^chromium-/.test(name)).sort().at(-1);
    if (installed) executablePath = path.join(process.env.LOCALAPPDATA, "ms-playwright", installed, "chrome-win", "chrome.exe");
  }
  browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
  page.on("pageerror", error => { errors.push(error.message); console.error(error.message); });
  page.on("console", message => { if (message.type() === "error") console.error(message.text()); });
  await page.goto("http://127.0.0.1:4189/");
  await page.getByRole("heading", { name: "Coverage and availability" }).waitFor();
  await page.getByLabel("Primary operator").selectOption("primary");
  await page.getByLabel("Backup operator").selectOption("backup");
  await page.getByLabel("I affirm the backup coverage arrangement").check();
  await page.getByLabel("Pause new reports", { exact: true }).check();
  await page.getByLabel("Pause invitations", { exact: true }).check();
  await page.getByLabel("Public explanation · English").fill("Operator coverage is temporarily unavailable.");
  await page.getByLabel("Public explanation · Filipino").fill("Pansamantalang walang operator na available.");
  assert.equal(await page.getByText("New reports: open", { exact: true }).count(), 1, "unsaved state is not confirmed");
  await page.getByRole("button", { name: "Save operating controls" }).click();
  await page.getByText("Changes saved.", { exact: true }).waitFor();
  await page.getByText("New reports: paused", { exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Invite resident", exact: true }).isDisabled(), true);
  async function inspect(surface) {
    for (const [name,width,height] of [["desktop",1440,1000],["tablet",768,1024],["mobile",390,844],["zoom400",360,800]]) {
      await page.setViewportSize({width,height});
      await page.evaluate(()=>window.scrollTo(0,0));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth), surface+" "+name+" overflow");
      await page.screenshot({path:path.join(output,surface+"-"+name+".png"),fullPage:true});
      await page.addScriptTag({path:path.join(root,"node_modules/axe-core/axe.min.js")});
      const violations=await page.evaluate(async()=> (await window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations.map(item=>({id:item.id,impact:item.impact})));
      assert.deepEqual(violations,[],surface+" "+name+" axe");
    }
    await page.emulateMedia({reducedMotion:"reduce",forcedColors:"active"});
    await page.screenshot({path:path.join(output,surface+"-forced-colors.png"),fullPage:true});
    await page.emulateMedia({forcedColors:"none"});
    await page.keyboard.press("Tab");
    assert.ok(await page.evaluate(()=>document.activeElement!==document.body));
  }
  await inspect("administration");
  await page.getByRole("button",{name:"Filipino",exact:true}).click();
  await page.getByRole("heading",{name:"Mga operator at availability"}).waitFor();
  await page.screenshot({path:path.join(output,"administration-filipino.png"),fullPage:true});
  await page.getByRole("button",{name:"English",exact:true}).click();
  await page.getByRole("button",{name:"Fixture resident"}).click();
  await page.getByRole("heading",{name:"New reports are paused"}).waitFor();
  await page.getByLabel(/Category/).selectOption("streetlights");
  await page.getByLabel("Describe the concern").fill("Synthetic draft used only for pause verification.");
  await page.getByLabel("Nearby landmark",{exact:true}).fill("Synthetic court");
  const draft = await page.evaluate(()=>localStorage.getItem("ayos-report-draft-v1"));
  await page.getByRole("button",{name:"Check availability"}).click();
  assert.equal(await page.getByRole("button",{name:"Submit report",exact:true}).isDisabled(),true);
  assert.equal(await page.evaluate(()=>localStorage.getItem("ayos-report-draft-v1")),draft);
  await inspect("resident");
  await page.getByRole("button",{name:"Lumipat sa Filipino",exact:true}).click();
  await page.getByRole("heading",{name:"Pansamantalang sarado ang bagong ulat"}).waitFor();
  await page.screenshot({path:path.join(output,"resident-filipino.png"),fullPage:true});
  await page.getByRole("button",{name:"Switch to English",exact:true}).click();
  await page.getByRole("button",{name:"Fixture administration"}).click();
  await page.getByLabel("Pause new reports",{exact:true}).uncheck();
  await page.getByLabel("Before resuming", {exact:false}).check();
  await page.getByRole("button",{name:"Save operating controls"}).click();
  await page.getByText("New reports: open",{exact:true}).waitFor();
  assert.equal(await page.getByText("Invitations: paused",{exact:true}).count(),1);
  await page.getByRole("button",{name:"Fixture resident"}).click();
  await page.getByRole("button",{name:"Resume draft",exact:true}).click();
  await page.getByLabel("I confirm this is not an emergency.").check();
  await page.getByLabel(/I understand that only/).check();
  await page.getByRole("button",{name:"Submit report",exact:true}).click();
  await page.waitForFunction(()=>window.__receipt==="/reports/AS-SYNTHETIC");
  assert.equal(await page.evaluate(()=>localStorage.getItem("ayos-report-draft-v1")),null);
  assert.deepEqual(errors,[]);
  console.log("PASS: synthetic coverage/pause/resume browser journey, draft retention, independent invitation pause, EN/FIL, desktop/tablet/mobile/400%-equivalent reflow, forced colors, reduced motion, keyboard and axe. Not deployed or human screen-reader evidence.");
} finally { await browser?.close(); await server.close(); }
