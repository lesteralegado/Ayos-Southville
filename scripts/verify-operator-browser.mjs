import assert from "node:assert/strict";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "@playwright/test";
import { createServer, transformWithOxc } from "vite";
const root = process.cwd();
const artifacts = path.join(root, ".scratch/simplified-product-flow/artifacts");
await mkdir(artifacts, { recursive: true });
const capture = !process.argv.includes("--functional-only");
const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { OperatorWorkspace } from '/src/features/reports/operator-workspace.tsx';
import '/src/app/globals.css';
const role = new URL(location.href).searchParams.get('role') || 'Administrator';
fetch('/api/moderation?filter=new&ownedFirst=1').then(r=>r.json()).then(async data=>{const detail=data.reports[0]?await fetch('/api/moderation?reference='+data.reports[0].reference).then(r=>r.json()):{report:null};createRoot(document.getElementById('root')).render(<OperatorWorkspace initialFilter="new" initialReports={data.reports} initialNextCursor={data.nextCursor} initialSelectedReport={detail.report} actor={{uid:'operator',roles:[role]}} destinations={[{id:'lighting',name:'Streetlight desk'}]} />)});
`;
let boundaries;
const server = await createServer({ cacheDir: path.join(root, "node_modules/.vite", "verify-operator-browser"),
  root, configFile: false, server: { watch: { ignored: ["**/.next/**", "**/.next-local/**", "**/.scratch/**"] }, host: "127.0.0.1", port: 4180, strictPort: true },
  resolve: { alias: { "@": path.join(root, "src") } }, oxc: { jsx: { runtime: "automatic" } },
  define: { "process.env": "{}" }, optimizeDeps: { exclude: ["next/link"] },
  plugins: [{
    name: "operator-verification",
    enforce: "pre",
    resolveId(id) { if (["/__operator.jsx", "next/link"].includes(id)) return "\0" + id; },
    async load(id) {
      if (id === "\0next/link") return "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}";
      if (id === "\0/__operator.jsx") return (await transformWithOxc(fixture, "fixture.tsx", { lang: "tsx", jsx: { runtime: "automatic" } })).code;
    },
    configureServer(vite) {
      async function setup() {
        if (boundaries) return boundaries;
        const domain = await vite.ssrLoadModule("/src/features/reports/moderation-module.ts");
        const upload = await vite.ssrLoadModule("/src/features/reports/evidence-module.ts");
        const prepare = await vite.ssrLoadModule("/src/features/reports/prepare-evidence-photo.ts");
        const seed = reference => ({ reference, reporterUid: "resident", category: "streetlights", description: "Private report: Block 9 Lot 12, 09171234567.", nearbyLandmark: "Covered court", exactLocation: { latitude: 14.281234, longitude: 121.126789, privateDetails: "Synthetic block and lot" }, evidence: [], status: "Submitted", submittedAt: "2026-10-10T02:00:00Z", public: { summary: "", area: "", media: [] }, followers: [], affectedResidents: [], supportingEvidence: [], history: [] });
        const store = domain.createMemoryModerationStore({ reports: ["AS-300001", "AS-300002", "AS-300003", "AS-300004"].map((reference, index) => ({ ...seed(reference), submittedAt: new Date(Date.parse("2026-10-10T02:00:00Z") - index * 1000).toISOString() })) });
        const evidenceStore = upload.createMemoryEvidenceStore();
        const evidence = upload.createEvidenceModule({ store: evidenceStore, prepare: prepare.prepareEvidencePhoto });
        const originalCommit = store.commit;
        store.commit = async change => {
          const photos = change.audit.action === "report.resolved" ? change.reports[0].resolutionEvidence : [];
          for (const asset of photos ?? []) {
            const record = await evidenceStore.get(asset.id);
            if (!record || record.residentUid !== change.actorUid || record.draftKey !== "resolution_" + change.reports[0].reference) throw new domain.ModerationValidationError("Use completed resolution uploads.");
            await evidence.read(change.actorUid, asset.id, false);
          }
          await originalCommit(change);
        };
        boundaries = { moderation: domain.createModerationModule({ store }), evidence, domain };
        return boundaries;
      }
      vite.middlewares.use(async (req, res, next) => {
        if (req.url === "/" || req.url.startsWith("/?")) {
          res.setHeader("Content-Type", "text/html");
          res.end('<!doctype html><html lang="en"><head><title>Operator verification</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@vite/client"></script><script type="module" src="/__operator.jsx"></script></body></html>');
          return;
        }
        if (!req.url.startsWith("/api/")) return next();
        const { moderation, evidence } = await setup();
        const actor = { uid: "operator", roles: [req.headers["x-fixture-role"] || "Administrator"] };
        try {
          const chunks = []; for await (const chunk of req) chunks.push(chunk);
          const body = Buffer.concat(chunks), url = new URL(req.url, "http://127.0.0.1:4180");
          let result;
          if (url.pathname === "/api/moderation") {
            if (req.method === "GET") result = url.searchParams.has("reference") ? { report: await moderation.getPrivateReport(actor, url.searchParams.get("reference")) } : await moderation.listWorkspacePage(actor, { filter: url.searchParams.get("filter") ?? "all", cursor: url.searchParams.get("cursor") });
            else {
              const { action, input } = JSON.parse(body);
              if (action === "assign" && input.destination !== "lighting") throw new Error("Invalid desk");
              if (!["accept", "reject", "merge", "assign", "transition", "reassignOwner"].includes(action)) throw new Error("Unknown action");
              await moderation[action](actor, input); result = { ok: true };
            }
          } else if (url.pathname === "/api/evidence" && req.method === "GET") result = { assets: await evidence.list(actor.uid, url.searchParams.get("draftKey")) };
          else if (url.pathname === "/api/evidence" && req.method === "POST") {
            const form = await new Request(url, { method: "POST", headers: { "content-type": req.headers["content-type"] }, body }).formData();
            const file = form.get("photo");
            result = { asset: await evidence.upload({ residentUid: actor.uid, draftKey: form.get("draftKey"), slotId: form.get("slotId"), bytes: new Uint8Array(await file.arrayBuffer()), type: file.type }) };
          } else if (url.pathname.startsWith("/api/evidence/")) {
            const file = await evidence.read(actor.uid, url.pathname.split("/").at(-1), false);
            res.setHeader("Content-Type", file.type); res.end(Buffer.from(file.bytes)); return;
          } else throw new Error("Unknown fixture route");
          res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "private, no-store"); res.end(JSON.stringify(result));
        } catch (error) {
          res.statusCode = error.code === "FORBIDDEN" ? 403 : error.code === "CONFLICT" ? 409 : 422;
          res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ error: error.message, code: error.code }));
        }
      });
    },
  }],
});
let browser;
try {
  await server.listen();
  let executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath();
  if (!executablePath && process.platform === "win32") {
    const cache = path.join(process.env.LOCALAPPDATA, "ms-playwright");
    const installed = (await readdir(cache)).filter(name => /^chromium-/.test(name)).sort().at(-1);
    if (installed) executablePath = path.join(cache, installed, "chrome-win", "chrome.exe");
  }
  browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://127.0.0.1:4180/");
  await page.getByRole("heading", { name: "Report operations" }).waitFor();
  await page.getByText("Edit public details", { exact: true }).click();
  await page.getByLabel("Public summary", { exact: true }).fill("Broken streetlight beside the covered court.");
  await page.getByLabel("Public area", { exact: true }).fill("Phase 2 · Covered court");
  await page.getByLabel("Approximate latitude").fill("14.28");
  await page.getByLabel("Approximate longitude").fill("121.13");
  for (const [name, width, height] of capture ? [["desktop", 1440, 1000], ["tablet", 768, 1024], ["mobile", 390, 844]] : []) {
    await page.setViewportSize({ width, height }); await page.evaluate(() => scrollTo(0, 0));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + " overflow");
    await page.screenshot({ path: path.join(artifacts, "operator-" + name + ".png"), fullPage: true });
    await page.addScriptTag({ path: path.join(root, "node_modules/axe-core/axe.min.js") });
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })));
    assert.deepEqual(violations, [], name + " accessibility");
  }
  await page.getByRole("button", { name: "Filipino", exact: true }).click();
  await page.getByRole("heading", { name: "Pamamahala ng mga ulat" }).waitFor();
  if (capture) await page.screenshot({ path: path.join(artifacts, "operator-mobile-filipino.png"), fullPage: true });
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.keyboard.press("Tab"); assert.ok(await page.evaluate(() => document.activeElement !== document.body));
  await page.evaluate(() => document.documentElement.style.fontSize = "200%");
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) {
    console.log('Operator zoom overflow:', await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, nodes: [...document.querySelectorAll('body *')].map(node => ({ tag: node.tagName, className: node.className, right: node.getBoundingClientRect().right, width: node.getBoundingClientRect().width, scroll: node.scrollWidth, client: node.clientWidth })).filter(node => node.right > innerWidth || node.scroll > node.client + 1) })));
    await page.screenshot({ path: path.join(artifacts, 'operator-zoom-overflow.png'), fullPage: false });
  }
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "200% text zoom");
  if (capture) await page.screenshot({ path: path.join(artifacts, 'operator-zoom200.png'), fullPage: false });
  await page.evaluate(() => document.documentElement.style.fontSize = "");
  await page.locator(".admin-shell > details.advanced-disclosure > summary").click();
  await page.getByLabel("Report status", { exact: true }).selectOption("active");
  await page.getByRole("button", { name: "Approve and publish" }).click();
  await page.getByRole("button", { name: "Start work" }).waitFor();
  await page.getByLabel("English update").fill("Repair work has started.");
  await page.getByLabel("Filipino update").fill("Nagsimula ang pagkukumpuni.");
  const stale = await page.request.patch("http://127.0.0.1:4180/api/moderation", { data: { action: "assign", input: { reference: "AS-300001", expectedRevision: 0, priority: "high", destination: "lighting", reason: "stale", update: { en: "stale", fil: "luma" } } } });
  assert.equal(stale.status(), 409);
  await page.route("**/api/moderation", route => route.request().method() === "PATCH" ? route.abort("failed") : route.continue());
  await page.getByRole("button", { name: "Start work" }).click();
  await page.getByRole("alert").filter({ hasText: "Connection interrupted" }).waitFor();
  assert.equal(await page.getByLabel("English update").inputValue(), "Repair work has started.");
  await page.unroute("**/api/moderation");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page.getByText("Latest reports loaded.", { exact: false }).waitFor();
  await page.getByRole("button", { name: "Start work" }).click();
  await page.getByRole("button", { name: "Mark resolved" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Mark resolved" }).isDisabled(), true);
  const photo = await sharp({ create: { width: 160, height: 120, channels: 3, background: "#1f674b" } }).jpeg().toBuffer();
  await page.getByText("No photos yet.", { exact: false }).waitFor();
  await page.getByLabel("Choose photos").setInputFiles({ name: "resolution.jpg", mimeType: "image/jpeg", buffer: photo });
  await page.getByText("uploads confirmed", { exact: false }).waitFor();
  await page.getByLabel("English update").fill("The light was repaired and tested.");
  await page.getByLabel("Filipino update").fill("Naayos at sinubukan ang ilaw.");
  await page.getByRole("button", { name: "Mark resolved" }).click();
  await page.getByRole("heading", { name: "AS-300001 · Resolved" }).waitFor();
  await page.getByRole("button", { name: /AS-300002/ }).click();
  await page.locator(".operator-more > summary").click();
  await page.getByLabel("Review decision").selectOption("reject");
  await page.getByLabel("Decision reason").fill("Outside the controlled pilot scope.");
  await page.getByRole("button", { name: "Reject report" }).click();
  await page.getByRole("heading", { name: "AS-300002 · Rejected" }).waitFor();
  await page.getByRole("button", { name: /AS-300003/ }).click();
  await page.getByText("Edit public details", { exact: true }).click();
  await page.getByLabel("Public summary", { exact: true }).fill("Another approved light concern.");
  await page.getByLabel("Public area", { exact: true }).fill("Court");
  await page.getByRole("button", { name: "Approve and publish" }).click();
  await page.getByRole("button", { name: "Start work" }).waitFor();
  await page.getByRole("button", { name: /AS-300004/ }).click();
  await page.locator(".operator-more > summary").click();
  await page.getByLabel("Review decision").selectOption("merge");
  await page.getByLabel("Canonical report", { exact: true }).fill("AS-300003");
  await page.getByRole("button", { name: "Find canonical report" }).click();
  await page.getByText("AS-300003: Another approved light concern.", { exact: true }).waitFor();
  await page.getByLabel("Decision reason").fill("Same light concern.");
  await page.getByRole("button", { name: "Merge duplicate", exact: true }).click();
  await page.getByRole("heading", { name: "AS-300004 · Duplicate" }).waitFor();
  const { moderation } = boundaries;
  const publicReport = await moderation.getPublicReport("AS-300001");
  assert.ok(!/09171234567|Block 9|Synthetic block/.test(JSON.stringify(publicReport)));
  await assert.rejects(moderation.getPublicReport("AS-300002"));
  assert.equal((await moderation.getPrivateReport({ uid: "operator", roles: ["Administrator"] }, "AS-300001")).resolutionEvidence.length, 1);
  assert.equal((await moderation.listAudit({ uid: "operator", roles: ["Administrator"] })).length, 6);
  const moderatorPage = await browser.newPage({ extraHTTPHeaders: { "x-fixture-role": "Moderator" } });
  await moderatorPage.goto("http://127.0.0.1:4180/?role=Moderator");
  await moderatorPage.getByRole("heading", { name: "Report operations" }).waitFor();
  await moderatorPage.locator(".admin-shell > details.advanced-disclosure > summary").click();
  await moderatorPage.getByLabel("Report status", { exact: true }).selectOption("active");
  await moderatorPage.getByRole("button", { name: /AS-300003/ }).click();
  assert.equal(await moderatorPage.getByRole("button", { name: "Assign report" }).count(), 0);
  const forbidden = await moderatorPage.request.patch("http://127.0.0.1:4180/api/moderation", { data: { action: "assign", input: { reference: "AS-300003", expectedRevision: 1, priority: "high", destination: "lighting", reason: "forbidden", update: { en: "test", fil: "test" } } } });
  assert.equal(forbidden.status(), 403);
  assert.deepEqual(errors, []);
  console.log("Operator accept/redact, assign, start, real protected upload, resolve, reject, merge, forbidden role, public privacy, stale conflict, and connection recovery passed. " + (capture ? "Desktop/tablet/mobile, EN/FIL, axe contrast, keyboard, reduced motion and 200% text zoom passed." : "Functional-only confirmation.") + " Production Firebase/Auth remains a separate release gate.");
} finally { await browser?.close(); await server.close(); }
