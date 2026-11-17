import assert from "node:assert/strict";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { createServer, transformWithOxc } from "vite";
const root=process.cwd(),output=path.join(root,".scratch/reporting-flow-refinement/artifacts");
await mkdir(output,{recursive:true});
const fixture=`
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {ReportDetail} from '/src/features/reports/report-detail.tsx';
import {resolutionOutcomeUpdate} from '/src/features/reports/resolution-copy.ts';
import '/src/app/globals.css';
const date='2026-11-17T00:00:00Z';
function Harness(){const [state,setState]=useState({status:'Resolved',owner:true});window.__show=setState;
const timeline=[{status:'Under review',occurredAt:date},{status:'Resolved',occurredAt:'2026-11-17T01:00:00Z'},...(state.disputed?[{status:'Under review',occurredAt:'2026-11-17T02:00:00Z',update:resolutionOutcomeUpdate.dispute}]:[])];
const report={reference:'AS-PROGRESS',category:'streetlights',publicSummary:'Broken light at the court',publicArea:'Covered court',publicLocation:{latitude:14.281234567,longitude:121.126789123},media:[],status:state.status,submittedAt:date,timeline};
const request={id:'question',question:'Private question about the entrance',actorUid:'operator',occurredAt:date,revision:1,...(state.answered?{response:{explanation:'Private answer',actorUid:'resident',occurredAt:date}}:{})};
const owned={...report,reporterUid:'resident',description:'Original private description',nearbyLandmark:'Court',evidence:[],history:state.status==='Rejected'?[{action:'rejected:out-of-scope',occurredAt:date,reason:'Outside the pilot categories'}]:state.status==='Duplicate'?[{action:'merged-into:AS-CANONICAL',occurredAt:date,reason:'Same light as the original report'}]:timeline.map(event=>({...event,action:'status'})),...(state.question?{clarifications:[request]}:{}),...(state.archived?{archivedAt:date}:{}),...(state.archiveRequested?{removalRequestedAt:date}:{}),...(state.status==='Duplicate'?{canonicalReference:'AS-CANONICAL'}:{})};
window.fetch=async(url,options)=>{if(options?.method==='PATCH'){const {input}=JSON.parse(options.body);setState({...state,status:input.response==='dispute'?'Under review':'Resident confirmed',disputed:input.response==='dispute'});}return Response.json({ok:true});};
return <ReportDetail report={report} ownedReport={state.owner?owned:undefined} privateReceipt={state.owner} demonstration={!state.owner} archived={!!state.archived} canRespond={state.owner&&state.status==='Resolved'}/>;}
createRoot(document.body).render(<Harness/>);`;
const server=await createServer({root,configFile:false,cacheDir:path.join(root,"node_modules/.vite/verify-progress"),resolve:{alias:{"@":path.join(root,"src")}},oxc:{jsx:{runtime:"automatic"}},define:{"process.env":"{}"},optimizeDeps:{exclude:["next/link","next/navigation"]},server:{host:"127.0.0.1",port:4198,strictPort:true,watch:{ignored:["**/.next/**","**/.scratch/**"]}},plugins:[{name:"progress-fixture",enforce:"pre",resolveId(id){if(["/__progress.jsx","next/link","next/navigation"].includes(id))return "\0"+id;},async load(id){
if(id==="\0next/link")return "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}";
if(id==="\0next/navigation")return "export const useRouter=()=>({refresh(){}})";
if(id==="\0/__progress.jsx")return(await transformWithOxc(fixture,"fixture.tsx",{lang:"tsx",jsx:{runtime:"automatic"}})).code;
},configureServer(vite){vite.middlewares.use((req,res,next)=>{if(req.url!=="/")return next();res.setHeader("Content-Type","text/html");res.end('<!doctype html><html lang="en"><head><title>Resident progress verification</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script type="module" src="/__progress.jsx"></script></body></html>');});}}]});
let browser;
try{
await server.listen();browser=await chromium.launch({headless:true});
for(const [locale,width] of [["en",1440],["fil",390]]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce"}),errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 await page.addInitScript(value=>localStorage.setItem("ayos-locale",value),locale);
 await page.goto("http://127.0.0.1:4198/");
 await page.addScriptTag({path:path.join(root,"node_modules/axe-core/axe.min.js")});
 const accessible=async()=>{
  assert.deepEqual(await page.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations.map(v=>v.id)),[]);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 };
 const t=(en,fil)=>locale==="en"?en:fil;
 await page.getByRole("heading",{name:"Broken light at the court"}).waitFor();
 const show=async state=>{await page.evaluate(state=>window.__show(state),state);await page.waitForTimeout(60);};
 const steps=page.getByRole("list",{name:t("Report progress","Progreso ng ulat")});
 assert.equal(await steps.locator("li").count(),3);
 assert.equal(await page.locator('[aria-current="step"]').textContent(),t("Resolved","Nalutas"));
 await page.getByText(t("Awaiting your confirmation","Naghihintay ng iyong kumpirmasyon"),{exact:true}).waitFor();
 await page.screenshot({path:path.join(output,`progress-resolved-${locale}.png`),fullPage:true});
 await accessible();
 await page.getByLabel(t("Reason (3–4,000 characters)","Dahilan (3–4,000 character)")).fill("The light still flickers");
 await page.getByRole("button",{name:t("Still a problem","May problema pa rin"),exact:true}).focus();
 await page.keyboard.press("Enter");
 await page.getByText(t("Still a problem · Under review","May problema pa rin · Sinusuri"),{exact:true}).waitFor();
 assert.equal(await page.locator('[aria-current="step"]').textContent(),t("Submitted","Isinumite"));
 assert.equal(await page.locator('time[datetime="2026-11-17T01:00:00Z"]').count(),1);
 await page.screenshot({path:path.join(output,`progress-disputed-${locale}.png`),fullPage:true});
 await accessible();
 for(const [status,index] of [["Submitted",0],["Under review",0],["Assigned",1],["In progress",1],["Resolved",2],["Resident confirmed",2]]){
  await show({status,owner:true});assert.equal(await steps.locator('li[aria-current="step"]').count(),1);assert.equal(await steps.locator("li").nth(index).getAttribute("aria-current"),"step");
 }
 await show({status:"Under review",owner:true,question:true});
 await page.getByText("Private question about the entrance").waitFor();
 await show({status:"Under review",owner:true,question:true,answered:true});
 await page.getByText(t("Your response is awaiting operator review.","Naghihintay ng pagsusuri ng operator ang iyong sagot."),{exact:true}).first().waitFor();
 await show({status:"Under review",owner:false,question:true,archiveRequested:true});
 assert.equal(await page.getByText("Private question about the entrance").count(),0);
 assert.equal(await page.getByText(t("Archive requested","Hiniling ang pag-archive"),{exact:true}).count(),0);
 await page.getByText(t("Published","Nailathala"),{exact:true}).waitFor();
 await show({status:"Under review",owner:true,archiveRequested:true});
 await page.getByText(t("Archive requested","Hiniling ang pag-archive"),{exact:true}).waitFor();
 for(const status of ["Rejected","Duplicate"]){await show({status,owner:true});assert.equal(await steps.count(),0);await page.getByText(status==="Rejected"?"Outside the pilot categories":"Same light as the original report").first().waitFor();}
 assert.equal(await page.getByRole("link",{name:/AS-CANONICAL/}).getAttribute("href"),"/reports/AS-CANONICAL");
 await show({status:"Resolved",owner:true,archived:true});assert.equal(await steps.count(),0);
 await page.screenshot({path:path.join(output,`progress-archived-${locale}.png`),fullPage:true});
 await accessible();
 assert.deepEqual(errors,[]);await page.close();
}
console.log("PASS: bilingual three-step status/context matrix, legacy Assigned, private/public separation, keyboard dispute, retained timeline dates, terminal outcomes, responsive layout and axe.");
}finally{await browser?.close();await server.close();}
