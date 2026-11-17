import assert from "node:assert/strict";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { createServer, transformWithOxc } from "vite";
const root=process.cwd(),output=path.join(root,".scratch/reporting-flow-refinement/artifacts");
await mkdir(output,{recursive:true});
const fixture=`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {NotificationCenter} from '/src/features/reports/notification-center.tsx';
import {ReportUnavailable} from '/src/features/reports/report-unavailable.tsx';
import '/src/app/globals.css';
let read=false,preferences={emailEnabled:false,statusUpdates:true,followUpdates:true};
const notice={id:'notice',residentUid:'resident',reference:'AS-PRIVATE',kind:'report-update',message:'Open your private report for the decision.',createdAt:'2026-11-17T00:00:00Z'};
window.fetch=async(url,options)=>{if(options?.method==='PATCH'){const input=JSON.parse(options.body);if(input.notificationId)read=true;else preferences=input.preferences;}return Response.json({notifications:[{...notice,read}],preferences,unreadCount:read?0:1});};
function Harness(){const [missing,setMissing]=useState(false);window.__missing=setMissing;return missing?<ReportUnavailable reference='AS-PRIVATE'/>:<NotificationCenter/>;}
createRoot(document.body).render(<Harness/>);`;
const server=await createServer({root,configFile:false,cacheDir:path.join(root,"node_modules/.vite/verify-notifications"),resolve:{alias:{"@":path.join(root,"src")}},oxc:{jsx:{runtime:"automatic"}},define:{"process.env":"{}"},optimizeDeps:{exclude:["next/link","next/navigation"]},server:{host:"127.0.0.1",port:4197,strictPort:true,watch:{ignored:["**/.next/**","**/.scratch/**"]}},plugins:[{name:"notifications-fixture",enforce:"pre",resolveId(id){if(["/__notifications.jsx","next/link","next/navigation"].includes(id))return "\0"+id;},async load(id){
if(id==="\0next/link")return "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}";
if(id==="\0next/navigation")return "export const useRouter=()=>({refresh(){}})";
if(id==="\0/__notifications.jsx")return(await transformWithOxc(fixture,"fixture.tsx",{lang:"tsx",jsx:{runtime:"automatic"}})).code;
},configureServer(vite){vite.middlewares.use((req,res,next)=>{if(req.url!=="/")return next();res.setHeader("Content-Type","text/html");res.end('<!doctype html><html lang="en"><head><title>Resident progress verification</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script type="module" src="/__notifications.jsx"></script></body></html>');});}}]});
let browser;
try{
await server.listen();browser=await chromium.launch({headless:true});
for(const [locale,width] of [["en",1440],["fil",390]]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce"}),errors=[];
 page.setDefaultTimeout(15000);
 page.on("pageerror",error=>errors.push(error.message));
 await page.addInitScript(value=>localStorage.setItem("ayos-locale",value),locale);
 await page.goto("http://127.0.0.1:4197/");
 await page.addScriptTag({path:path.join(root,"node_modules/axe-core/axe.min.js")});
 const accessible=async()=>{
  assert.deepEqual(await page.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))),[]);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 };
 const t=(en,fil)=>locale==="en"?en:fil;


 await page.getByRole("link",{name:/AS-PRIVATE/}).waitFor();
 assert.equal(await page.getByRole("link",{name:/AS-PRIVATE/}).getAttribute("href"),"/reports/AS-PRIVATE?from=notification");
 await page.getByRole("button",{name:t("Mark read","Markahang nabasa"),exact:true}).focus();await page.keyboard.press("Enter");
 await page.getByRole("status").filter({hasText:t("Notification marked read.","Namarkahang nabasa ang abiso.")}).waitFor();
 await page.locator("summary").click();
 await page.getByLabel(t("Email important updates","I-email ang mahahalagang update"),{exact:true}).click();
 await page.getByRole("status").filter({hasText:t("Preferences saved.","Na-save ang mga kagustuhan.")}).waitFor();
 assert.equal(await page.locator(".notification-list li").count(),1);
 await page.screenshot({path:path.join(output,`notifications-${locale}.png`),fullPage:true});await accessible();
 await page.evaluate(()=>window.__missing(true));
 await page.getByRole("heading",{name:t("Report unavailable","Hindi ma-access ang ulat")}).waitFor();
 assert.equal(await page.getByRole("link",{name:t("Back to updates","Bumalik sa mga update"),exact:true}).getAttribute("href"),"/account/notifications");
 assert.equal(await page.getByRole("link",{name:t("My reports","Aking mga ulat"),exact:true}).getAttribute("href"),"/account/reports");
 await page.screenshot({path:path.join(output,`notification-recovery-${locale}.png`),fullPage:true});await accessible();
 assert.deepEqual(errors,[]);await page.close();
}
console.log("PASS: bilingual notification destinations, keyboard read state, inline preference confirmation, retained inbox, missing-report recovery, responsive layout and axe.");
}finally{await browser?.close();await server.close();}
