import assert from "node:assert/strict";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { createServer, transformWithOxc } from "vite";

const root = process.cwd(), artifacts = path.join(root, ".scratch/report-pin-accuracy/artifacts");
await mkdir(artifacts, { recursive: true });
const fixture = `import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import * as libre from 'maplibre-gl';import {PrimaryReportAction} from '/src/features/reports/primary-report-action.tsx';import CommunityMap from '/src/features/reports/community-map.tsx';import {publicProjection} from '/src/features/reports/public-projection.ts';import '/src/app/globals.css';
const pin={latitude:14.281234567,longitude:121.126789123};const set=libre.Marker.prototype.setLngLat;libre.Marker.prototype.setLngLat=function(value){window.markerPin=value;return set.call(this,value)};
const report={reference:'AS-PIN',reporterUid:'resident',category:'streetlights',description:'Broken streetlight beside the court.',nearbyLandmark:'Covered court',exactLocation:{...pin,privateDetails:'Private gate'},evidence:[],status:'Submitted',submittedAt:'2026-11-13T00:00:00Z',public:{summary:'',area:'',media:[]},followers:[],affectedResidents:[],supportingEvidence:[],history:[]};
function App(){const [published,setPublished]=useState(null);const locale=new URL(location.href).searchParams.get('locale')==='fil'?'fil':'en';return <main className="admin-page operator-page"><div className="admin-shell"><h1>Report pin verification</h1>{published?<CommunityMap reports={[published]} locale={locale} style={{version:8,sources:{},layers:[{id:'paper',type:'background',paint:{'background-color':'#ebe5d7'}}]}}/>:<PrimaryReportAction report={report} actor={{uid:'operator',roles:['Administrator']}} locale={locale} pending={false} mutate={async(action,input)=>{window.approvedPin=input.publicLocation;setPublished(publicProjection({approved:true,reference:report.reference,category:report.category,status:'Under review',submittedAt:report.submittedAt,publicSummary:input.publicSummary,publicArea:input.publicArea,publicLocation:input.publicLocation,media:[],timeline:[]}))}}/>}</div></main>}createRoot(document.getElementById('root')).render(<App/>);`;
const server = await createServer({ root, configFile: false, resolve: { alias: { "@": path.join(root, "src") } }, oxc: { jsx: { runtime: "automatic" } }, define: { "process.env": "{}" }, optimizeDeps: { exclude: ["next/link"] }, server: { host: "127.0.0.1", port: 4188, strictPort: true, watch: { ignored: ["**/.next/**", "**/.scratch/**"] } }, plugins: [{ name: "pin-fixture", enforce: "pre", resolveId(id) { if (["/__pin.jsx", "next/link"].includes(id)) return "\0" + id; }, async load(id) {
  if (id === "\0next/link") return "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}";
  if (id === "\0/__pin.jsx") return (await transformWithOxc(fixture, "fixture.tsx", { lang: "tsx", jsx: { runtime: "automatic" } })).code;
}, configureServer(vite) { vite.middlewares.use((req, res, next) => { if (!req.url.startsWith("/?locale=")) return next(); res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html lang="en"><head><title>Pin verification</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/__pin.jsx"></script></body></html>'); }); } }] });
let browser;
try {
  await server.listen(); browser = await chromium.launch({ headless: true });
  for (const [name, width, height, locale] of [["desktop", 1440, 1000, "en"], ["phone-fil", 390, 844, "fil"]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(`http://127.0.0.1:4188/?locale=${locale}`);
    await page.getByText(locale === "fil" ? "Baguhin ang pampublikong detalye" : "Edit public details", { exact: true }).click();
    assert.equal(await page.locator("form").evaluate(form => form.checkValidity()), true);
    await page.screenshot({ path: path.join(artifacts, `${name}-approval.png`), fullPage: true });
    await page.getByRole("button", { name: locale === "fil" ? "Aprubahan at ilathala" : "Approve and publish", exact: true }).click();
    await page.locator(".public-map-marker").waitFor();
    assert.deepEqual(await page.evaluate(() => window.approvedPin), { latitude: 14.281234567, longitude: 121.126789123 });
    assert.deepEqual(await page.evaluate(() => window.markerPin), [121.126789123, 14.281234567]);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(artifacts, `${name}-public.png`), fullPage: true });
    await page.close();
  }
  console.log("Exact selected pin preserved through approval, projection and real MapLibre marker on desktop and phone.");
} finally { await browser?.close(); await server.close(); }
