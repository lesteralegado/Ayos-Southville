import assert from "node:assert/strict";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { createServer, transformWithOxc } from "vite";
import sharp from "sharp";

const root = process.cwd(), artifacts = path.join(root, ".scratch/simplified-product-flow/artifacts");
const tile = await sharp({ create: { width: 256, height: 256, channels: 3, background: "#ebe5d7" } }).png().toBuffer();
await mkdir(artifacts, { recursive: true });
const capture = !process.argv.includes("--functional-only");
const fixture = `import React,{useEffect,useState} from 'react';import {createRoot} from 'react-dom/client';
import {useLocale} from '/src/features/i18n/use-locale.ts';import Home from '/src/app/page.tsx';import {PublicInsights} from '/src/features/admin/public-insights.tsx';import {ReportDetail} from '/src/features/reports/report-detail.tsx';import '/src/app/globals.css';
function App(){const {locale,chooseLocale}=useLocale();const [data,setData]=useState(null);const ref=location.pathname.split('/')[2];useEffect(()=>{if(ref)fetch('/api/fixture-detail?reference='+ref).then(r=>r.json()).then(setData)},[ref]);return <><button type="button" onClick={()=>chooseLocale(locale==="en"?"fil":"en")}>{locale==="en"?"Filipino":"English"}</button>{ref?data?<ReportDetail report={data} categoryLabel={{en:'Configured lighting',fil:'Nasuring ilaw'}}/>:<p role="status">Loading report</p>:location.pathname==='/insights'?<PublicInsights/>:<Home/>}</>}createRoot(document.getElementById('root')).render(<App/>);`;
let boundaries;
const server = await createServer({ cacheDir: path.join(root, "node_modules/.vite", "verify-discovery-browser"), root, configFile: false, server: { host: "127.0.0.1", port: 4182, strictPort: true, watch: { ignored: ["**/.next/**", "**/.next-local/**", "**/.scratch/**"] } },
  resolve: { alias: { "@": path.join(root, "src") } }, oxc: { jsx: { runtime: "automatic" } }, define: { "process.env": "{}" },
  optimizeDeps: { exclude: ["next/link", "next/navigation"] }, plugins: [{ name: "discovery-verification", enforce: "pre",
    resolveId(id) { if (["/__discovery.jsx", "next/link", "next/navigation"].includes(id)) return "\0" + id; },
    async load(id) {
      if (id === "\0next/link") return "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}";
      if (id === "\0next/navigation") return "export const useRouter=()=>({refresh(){}});";
      if (id === "\0/__discovery.jsx") return (await transformWithOxc(fixture, "fixture.tsx", { lang: "tsx", jsx: { runtime: "automatic" } })).code;
    },
    configureServer(vite) {
      async function setup() {
        if (boundaries) return boundaries;
        const { createDiscoveryModule } = await vite.ssrLoadModule("/src/features/reports/discovery-module.ts");
        const { createPilotInsights } = await vite.ssrLoadModule("/src/features/admin/pilot-insights.ts");
        const categories = [{ id: "streetlights", active: true, label: { en: "Configured lighting", fil: "Nasuring ilaw" } }];
        const records = Array.from({ length: 25 }, (_, index) => ({ reference: `AS-${String(index).padStart(6,"0")}`, approved: true,
          category: "streetlights", status: index === 0 ? "Resolved" : "Assigned", publicSummary: `Reviewed streetlight concern ${index + 1}`,
          publicArea: "Reviewed court area", publicLocation: { latitude: 14.28 + (index % 2) * .01, longitude: 121.13 },
          submittedAt: "2026-10-10T00:00:00Z", media: index === 0 ? [{ id: "a".repeat(64), alt: "Reviewed broken streetlight beside the public court" }] : [],
          timeline: [{ status: "Under review", occurredAt: "2026-10-10T01:00:00Z" }, { status: index === 0 ? "Resolved" : "Assigned", occurredAt: "2026-10-10T04:00:00Z", update: index === 0 ? { en: "Light repaired and tested.", fil: "Naayos at nasubukan ang ilaw." } : { en: "Assigned to an internal review desk.", fil: "Itinalaga sa panloob na review desk." } }],
          reporterEmail: "private@example.invalid", exactLocation: { privateDetails: "Private house" },
        }));
        boundaries = { discovery: createDiscoveryModule({ read: async () => records, now: () => new Date("2026-10-11T00:00:00Z") }), categories, createPilotInsights };
        return boundaries;
      }
      vite.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, "http://127.0.0.1:4182");
        if (url.pathname === "/" || url.pathname === "/insights" || url.pathname.startsWith("/reports/")) {
          res.setHeader("Content-Type", "text/html");
          res.end('<!doctype html><html lang="en"><head><title>Live discovery verification</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@vite/client"></script><script type="module" src="/__discovery.jsx"></script></body></html>'); return;
        }
        if (!url.pathname.startsWith("/api/")) return next();
        const { discovery, categories, createPilotInsights } = await setup();
        try {
          let result;
          if (url.pathname === "/api/public-reports") result = { ...await discovery.list(url.searchParams), categories };
          else if (url.pathname === "/api/insights") result = { insights: createPilotInsights(await discovery.all()), categories, mode: "live" };
          else if (url.pathname === "/api/fixture-detail") result = (await discovery.all()).find(report => report.reference === url.searchParams.get("reference"));
          else if (/^\/api\/reports\/[^/]+\/engagement$/.test(url.pathname)) result = { affected: false, following: false, supportingEvidence: [] };
          else if (url.pathname.startsWith("/api/public-evidence/")) { res.setHeader("Content-Type", "image/png"); res.end(tile); return; }
          else throw new Error("Unknown fixture endpoint");
          res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(result));
        } catch (error) { res.statusCode = error.status ?? 503; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ code: error.code ?? "UNAVAILABLE" })); }
      });
    },
  }] });

let browser;
try {
  await server.listen();
  let executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath();
  if (!executablePath && process.platform === "win32") {
    const cache = path.join(process.env.LOCALAPPDATA, "ms-playwright");
    const installed = (await readdir(cache)).filter(name => /^chromium-/.test(name)).sort().at(-1);
    if (installed) executablePath = path.join(cache, installed, "chrome-win", "chrome.exe");
  }
  browser = await chromium.launch({ headless: true, executablePath, args: ["--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ reducedMotion: "reduce" }), errors = [], accessibilityFindings = [];
  page.on("pageerror", error => errors.push(error.message));
  // Real MapLibre renderer, deterministic raster responses; no dependency on public tile uptime.
  await page.route("https://tile.openstreetmap.org/**", route => route.fulfill({ contentType: "image/png", body: tile }));
  const base = "http://127.0.0.1:4182";
  async function inspect(surface) {
    if (!capture) return;
    for (const [device, width, height] of [["desktop",1440,1000],["tablet",768,1024],["mobile",390,844]]) {
      await page.setViewportSize({ width, height });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${surface} ${device} overflow`);
      if (capture && !(process.argv.includes("--remaining-inspection") && surface === "map-list")) await page.screenshot({ path: path.join(artifacts, `discovery-${surface}-${device}.png`), fullPage: true });
      await page.addScriptTag({ path: path.join(root,"node_modules/axe-core/axe.min.js") });
      const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a","wcag2aa","wcag21aa","wcag22aa"] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.failureSummary) })));
      if (violations.length) accessibilityFindings.push({ surface, device, violations });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await page.goto(base + "/?view=map");
  await page.getByRole("heading", { name: "Reviewed streetlight concern 1", exact: true }).waitFor();
  await page.locator(".maplibregl-canvas").waitFor();
  assert.equal(await page.locator(".report-card").count(),20);
  await page.waitForFunction(() => document.querySelectorAll(".public-map-marker").length === 2);
  assert.deepEqual(await page.locator(".public-map-marker").evaluateAll(nodes => nodes.flatMap(node => node.dataset.references.split(",")).sort()), await page.locator(".report-card").evaluateAll(nodes => nodes.map(node => node.id.replace("report-", "")).sort()));
  assert.ok(!await page.content().then(html => /private@example|Private house/.test(html)));
  await page.locator(".public-map-marker").first().click();
  await page.locator(".maplibregl-popup-content a").first().waitFor();
  assert.equal(await page.locator(".maplibregl-popup-content a").count(),10);
  assert.ok(await page.locator(".maplibregl-popup-content a").first().evaluate(node => node === document.activeElement));
  await page.locator(".maplibregl-popup-close-button").click();
  await inspect("map-list");
  await page.getByRole("button", { name:"Next page" }).click(); await page.getByRole("status").filter({hasText:"Page 2 of 2"}).waitFor(); assert.equal(await page.locator(".report-card").count(),5);
  await page.getByLabel("Status", {exact:true}).selectOption("Resolved"); await page.getByRole("status").filter({hasText:"1 approved reports"}).waitFor(); assert.equal(await page.locator(".report-card").count(),1); assert.ok(!new URL(page.url()).searchParams.has("page"));
  await page.reload(); await page.getByRole("heading", { name: "Reviewed streetlight concern 1",exact:true }).waitFor(); assert.equal(await page.getByLabel("Status",{exact:true}).inputValue(),"Resolved");
  await page.getByRole("button", {name:"Filipino",exact:true}).first().click(); await page.locator(".report-card").getByText("Nasuring ilaw",{exact:true}).waitFor();
  await inspect("filipino-filtered");
  await page.getByRole("button", {name:"English",exact:true}).first().click();
  await page.getByLabel("Category",{exact:true}).selectOption("streetlights"); await page.goBack(); assert.equal(await page.getByLabel("Category",{exact:true}).inputValue(),"all");
  await page.goto(base + "/?date=invalid"); await page.getByRole("alert").waitFor(); await page.getByRole("button",{name:"Clear filters"}).click(); await page.locator(".report-card").first().waitFor();
  await page.route("**/api/public-reports**", route => route.abort("failed")); await page.reload(); await page.getByRole("alert").waitFor(); assert.equal(await page.locator(".report-card").count(),0); await page.unroute("**/api/public-reports**"); await page.getByRole("button",{name:"Retry",exact:true}).click(); await page.locator(".report-card").first().waitFor();
  await page.goto(base + "/?category=no-match"); await page.getByText(/No approved reports match/).waitFor();
  await page.goto(base + "/insights"); await page.getByText("25", {exact:true}).first().waitFor(); await inspect("insights");
  await page.getByRole("button",{name:"Filipino",exact:true}).first().click(); await page.getByRole("heading",{name:"Mga resulta ng komunidad"}).waitFor(); await inspect("insights-filipino");
  await page.goto(base + "/reports/AS-000000"); await page.getByRole("heading",{name:"Reviewed streetlight concern 1"}).waitFor(); await page.getByRole("img",{name:"Reviewed broken streetlight beside the public court"}).waitFor(); await page.getByText("Naayos at nasubukan ang ilaw.",{exact:false}).waitFor(); await page.goto(base + "/reports/AS-000001"); await page.getByRole("heading",{name:"Reviewed streetlight concern 2"}).waitFor(); await inspect("detail");
  await page.route("**/api/reports/*/engagement", async route => {
    if (route.request().method() !== "POST") return route.continue();
    await new Promise(resolve => setTimeout(resolve,600));
    return route.abort("failed");
  });
  await page.getByRole("button",{name:"Tumanggap ng mga update",exact:true}).click();
  await page.getByRole("status").filter({hasText:"Sine-save ang inyong pinili"}).waitFor();
  await page.getByRole("status").filter({hasText:"Hindi na-save ang pagbabago"}).waitFor();
  assert.equal(await page.getByRole("button",{name:"Tumanggap ng mga update",exact:true}).getAttribute("aria-pressed"),"false");
  await page.unroute("**/api/reports/*/engagement");
  await page.keyboard.press("Tab"); assert.ok(await page.evaluate(() => document.activeElement !== document.body));
  await page.evaluate(() => document.documentElement.style.fontSize="200%"); assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),"200% text zoom");
  assert.deepEqual(errors, []);
  assert.deepEqual(accessibilityFindings, [], "batched accessibility findings");
  console.log("Discovery filters/shared URLs/back navigation/reload/pagination, real MapLibre/list equivalence, private-field exclusion, invalid/empty/offline/retry states, bilingual insights/details/approved evidence passed. " + (capture ? "Responsive axe and captures, " : "Functional-only checks, ") + "reduced motion, keyboard and text zoom passed with synthetic external fixtures.");
} finally { await browser?.close(); await server.close(); }
