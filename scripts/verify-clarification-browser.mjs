import assert from "node:assert/strict";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { createServer, transformWithOxc } from "vite";
const root = process.cwd(), output = path.join(root, ".scratch/reporting-flow-refinement/artifacts");
await mkdir(output, { recursive: true });
const fixture = `
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {createModerationModule,createMemoryModerationStore} from '/src/features/reports/moderation-module.ts';
import {OperatorClarification} from '/src/features/reports/operator-clarification.tsx';
import {ResidentClarification} from '/src/features/reports/resident-clarification.tsx';
import {PrimaryReportAction} from '/src/features/reports/primary-report-action.tsx';
import {useLocale} from '/src/features/i18n/use-locale.ts';import '/src/app/globals.css';
const actor={uid:'operator',roles:['Administrator']},resident={uid:'resident',roles:['Resident']};
const seed={reference:'AS-CLARIFY',reporterUid:'resident',category:'streetlights',description:'Original entrance light concern',nearbyLandmark:'Court',evidence:[],status:'Submitted',submittedAt:'2026-11-13T00:00:00Z',public:{summary:'',area:'',media:[]},followers:['neighbor'],affectedResidents:[],supportingEvidence:[],history:[]};
const store=createMemoryModerationStore({reports:[seed]}),module=createModerationModule({store});
function Harness(){const {locale}=useLocale();const [role,setRole]=useState('operator'),[report,setReport]=useState(seed),[error,setError]=useState('');
async function refresh(){setReport(await module.getPrivateReport(actor,seed.reference));window.__public=await module.getPublicReport(seed.reference).catch(()=>null);window.__private=await store.getReport(seed.reference);}
window.__refresh=refresh;window.__reload=refresh;
window.fetch=async(url,options)=>{const body=JSON.parse(options.body);await module.respondToClarification(resident,body.input);if(window.__loseReply){window.__loseReply=false;throw TypeError('Synthetic lost acknowledgement');}return Response.json({ok:true});};
async function mutate(action,input){try{await module[{'request-clarification':'requestClarification','review-clarification':'reviewClarification','publish-clarification':'publishClarification',accept:'accept'}[action]](actor,input);setError('');await refresh();}catch(e){setError(e.message);}}
return <main className='reports-page'><h1>Clarification verification</h1><button className='button button-quiet' onClick={async()=>{await refresh();setRole(role==='operator'?'resident':'operator');}}>Switch role</button>{error&&<p role='alert'>{error}</p>}<div className='detail-card'>{role==='operator'?<><OperatorClarification key={report.revision??0} report={report} actor={actor} locale={locale} pending={false} mutate={mutate}/><PrimaryReportAction key={'primary'+(report.revision??0)} report={report} actor={actor} locale={locale} pending={false} mutate={mutate}/></>:<ResidentClarification report={report}/>}</div></main>}
createRoot(document.body).render(<Harness/>);`;
const server = await createServer({ root, configFile: false, cacheDir: path.join(root,"node_modules/.vite/verify-clarification"), resolve: { alias: { "@": path.join(root,"src") } }, oxc: { jsx: { runtime: "automatic" } }, define: { "process.env": "{}" }, optimizeDeps: { exclude: ["next/link","next/navigation"] }, server: { host:"127.0.0.1", port:4197, strictPort:true, watch:{ignored:["**/.next/**","**/.scratch/**"]} }, plugins:[{name:"clarification-fixture",enforce:"pre",resolveId(id){if(["/__clarification.jsx","next/link","next/navigation"].includes(id))return "\0"+id;},async load(id){
  if(id==="\0next/link")return "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}";
  if(id==="\0next/navigation")return "export const useRouter=()=>({refresh(){window.__reload?.()}})";
  if(id==="\0/__clarification.jsx")return(await transformWithOxc(fixture,"fixture.tsx",{lang:"tsx",jsx:{runtime:"automatic"}})).code;
},configureServer(vite){vite.middlewares.use((req,res,next)=>{if(req.url!=="/")return next();res.setHeader("Content-Type","text/html");res.end('<!doctype html><html lang="en"><head><title>Local clarification verification</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script type="module" src="/__clarification.jsx"></script></body></html>');});}}]});
let browser;
try {
  await server.listen(); browser=await chromium.launch({headless:true});
  for(const [locale,width] of [["en",1440],["fil",390]]) {
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce"});const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.addInitScript(value=>localStorage.setItem("ayos-locale",value),locale);
    await page.goto("http://127.0.0.1:4197/");
    const t=(en,fil)=>locale==="en"?en:fil;
    const disclosure=page.locator('.clarification-panel summary').filter({hasText:t("Request information","Humingi ng impormasyon")});
    await disclosure.focus();
    await page.keyboard.press("Enter");
    await page.getByLabel(t("Question for the resident","Tanong para sa residente")).fill("Private question: which entrance?");
    await page.getByRole("button",{name:t("Request information","Humingi ng impormasyon"),exact:true}).click();
    await page.getByText(t("More information needed","Kailangan ng dagdag na impormasyon"),{exact:true}).waitFor();
    assert.equal(await page.getByRole("button",{name:t("Approve and publish","Aprubahan at ilathala"),exact:true}).count(),0);
    await page.getByRole("button",{name:"Switch role"}).click();
    await page.getByLabel(t("Your explanation","Iyong paliwanag")).fill("Private response: north entrance");
    await page.locator('summary').filter({hasText:t("Propose a correction (optional)","Magmungkahi ng pagwawasto (opsyonal)")}).click();
    await page.getByLabel(t("Corrected concern","Iwinastong concern"),{exact:true}).fill("Broken light at the north entrance");
    await page.getByLabel(t("Propose a replacement pin","Magmungkahi ng kapalit na pin"),{exact:true}).check();
    await page.getByLabel(t("Replacement latitude","Kapalit na latitude"),{exact:true}).fill("14.281234567");
    await page.getByLabel(t("Replacement longitude","Kapalit na longitude"),{exact:true}).fill("121.126789123");
    await page.evaluate(()=>window.__loseReply=true);
    await page.getByRole("button",{name:t("Send response","Ipadala ang sagot"),exact:true}).click();
    await page.getByRole("alert").waitFor();
    assert.equal(await page.getByLabel(t("Your explanation","Iyong paliwanag")).inputValue(),"Private response: north entrance");
    await page.getByRole("button",{name:t("Retry","Subukang muli"),exact:true}).click();
    await page.getByText(t("Your response is awaiting operator review.","Naghihintay ng pagsusuri ng operator ang iyong sagot."),{exact:true}).waitFor();
    await page.waitForFunction(()=>document.activeElement?.getAttribute("role")==="status");
    await page.getByRole("button",{name:"Switch role"}).click();
    await page.getByLabel(t("Private review reason","Pribadong dahilan ng pagsusuri")).fill("Reviewed resident correction");
    await page.getByRole("button",{name:t("Review response","Suriin ang sagot"),exact:true}).click();
    await page.getByRole("button",{name:t("Approve and publish","Aprubahan at ilathala"),exact:true}).waitFor();
    assert.equal(await page.getByLabel(t("Public summary","Pampublikong buod"),{exact:true}).inputValue(),"Broken light at the north entrance");
    assert.equal(await page.evaluate(()=>window.__public),null);
    assert.equal(await page.evaluate(()=>window.__private.description),"Original entrance light concern");
    await page.screenshot({path:path.join(output,`clarification-reviewed-${locale}.png`),fullPage:true});
    await page.addScriptTag({path:path.join(root,"node_modules/axe-core/axe.min.js")});
    assert.deepEqual(await page.evaluate(async()=>(await window.axe.run(document,{runOnly:{type:"tag",values:["wcag2a","wcag2aa","wcag21aa"]}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))),[]);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.getByRole("button",{name:t("Approve and publish","Aprubahan at ilathala"),exact:true}).click();
    await page.waitForFunction(()=>window.__public?.location);
    assert.deepEqual(await page.evaluate(()=>window.__public.location),{latitude:14.281234567,longitude:121.126789123});
    assert.doesNotMatch(JSON.stringify(await page.evaluate(()=>window.__public)),/Private question|Private response/);
    assert.deepEqual(errors,[]);await page.close();
  }
  console.log("PASS: bilingual private clarification, precise proposed pin, lost-acknowledgement replay, explicit review and publication; original retained; no private content in public view; responsive, keyboard-native disclosures and axe.");
} finally {await browser?.close();await server.close();}
