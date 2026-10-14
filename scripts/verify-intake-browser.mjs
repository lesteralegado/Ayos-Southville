import assert from "node:assert/strict";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "@playwright/test";
import { createServer, transformWithOxc } from "vite";

// Actual UI/application modules with deterministic private data adapters.
// This is not a production Auth/Firebase integration test.
const root = process.cwd();
const visualRound = !process.argv.includes("--functional-only");
const artifacts = path.join(
  root,
  ".scratch/ayos-southville-production-completion/artifacts",
);
await mkdir(artifacts, { recursive: true });
const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReportComposer } from '/src/features/reports/report-composer.tsx';
import '/src/app/globals.css';
const emergency = { message: 'Call emergency services', phone: '911', sourceUrl: 'https://ehotlines.e.gov.ph/' };
createRoot(document.getElementById('root')).render(<ReportComposer residentUid='fixture-resident' emergencyGuidance={{en: emergency, fil: emergency}} categories={[{id:'streetlights',label:{en:'Broken streetlight',fil:'Sirang ilaw sa kalsada'}}]} />);
`;
const server = await createServer({ cacheDir: path.join(root, "node_modules/.vite", "verify-intake-browser"),
  root,
  configFile: false,
  server: { watch: { ignored: ["**/.next/**", "**/.next-local/**", "**/.scratch/**"] }, host: "127.0.0.1", port: 4179, strictPort: true },
  resolve: { alias: { "@": path.join(root, "src") } },
  oxc: { jsx: { runtime: "automatic" } },
  define: { "process.env": "{}" },
  optimizeDeps: { exclude: ["next/link", "next/navigation"] },
  plugins: [
    {
      name: "intake-verification-fixture",
      enforce: "pre",
      transform(code, id) {
        if (id.endsWith("/location-picker.tsx"))
          return code.replace(
            /new URL\(\s*["']maplibre-gl\/dist\/maplibre-gl-worker\.mjs["'],\s*import\.meta\.url,?\s*\)\.toString\(\)/,
            "new URL('/node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs', location.origin).toString()",
          );
      },
      resolveId(id) {
        if (
          ["/__intake_fixture.jsx", "next/navigation", "next/link"].includes(id)
        )
          return "\0" + id;
      },
      async load(id) {
        if (id === "\0next/navigation")
          return "export const useRouter = () => ({ push: (target) => { window.__receipt = target; } });";
        if (id === "\0next/link")
          return `import React from 'react'; export default function Link({children, ...props}) { return React.createElement('a',props,children); }`;
        if (id === "\0/__intake_fixture.jsx")
          return (
            await transformWithOxc(fixture, "fixture.tsx", {
              lang: "tsx",
              jsx: { runtime: "automatic" },
            })
          ).code;
      },
      configureServer(vite) {
        let modules;
        async function boundaries() {
          if (modules) return modules;
          const evidenceCode = await vite.ssrLoadModule(
            "/src/features/reports/evidence-module.ts",
          );
          const reportCode = await vite.ssrLoadModule(
            "/src/features/reports/report-module.ts",
          );
          const preparation = await vite.ssrLoadModule(
            "/src/features/reports/prepare-evidence-photo.ts",
          );
          const engagementCode = await vite.ssrLoadModule(
            "/src/features/reports/engagement-module.ts",
          );
          const evidenceStore = evidenceCode.createMemoryEvidenceStore();
          const evidence = evidenceCode.createEvidenceModule({
            store: evidenceStore,
            prepare: preparation.prepareEvidencePhoto,
          });
          const reports = reportCode.createReportModule({
            store: reportCode.createMemoryReportStore(),
            nextReference: () => "AS-FIXTURE",
          });
          const engagement = engagementCode.createEngagementModule({
            store: engagementCode.createMemoryEngagementStore({
              reports: [
                {
                  reference: "AS-EXISTING",
                  category: "streetlights",
                  status: "In progress",
                  submittedAt: new Date().toISOString(),
                  publicLocation: { latitude: 14.28, longitude: 121.13 },
                },
              ],
            }),
          });
          modules = { evidence, reports, engagement };
          return modules;
        }
        vite.middlewares.use(async (req, res, next) => {
          if (req.url === "/") {
            res.setHeader("Content-Type", "text/html");
            res.end(
              '<!doctype html><html lang="en"><head><title>Intake verification</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@vite/client"></script><script type="module" src="/__intake_fixture.jsx"></script></body></html>',
            );
            return;
          }
          if (!req.url?.startsWith("/api/")) return next();
          try {
            const { evidence, reports, engagement } = await boundaries();
            const uid = "fixture-resident";
            const url = new URL(req.url, "http://127.0.0.1:4179");
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            const body = Buffer.concat(chunks);
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "private, no-store");
            let result;
            if (url.pathname === "/api/evidence" && req.method === "POST") {
              const request = new Request(url, {
                method: "POST",
                headers: { "content-type": req.headers["content-type"] },
                body,
              });
              const form = await request.formData();
              const photo = form.get("photo");
              result = {
                asset: await evidence.upload({
                  residentUid: uid,
                  draftKey: form.get("draftKey"),
                  slotId: form.get("slotId"),
                  bytes: new Uint8Array(await photo.arrayBuffer()),
                  type: photo.type,
                }),
              };
            } else if (url.pathname === "/api/evidence" && req.method === "GET")
              result = {
                assets: await evidence.list(
                  uid,
                  url.searchParams.get("draftKey"),
                ),
              };
            else if (url.pathname.startsWith("/api/evidence/")) {
              const id = url.pathname.split("/").at(-1);
              if (req.method === "DELETE") {
                await evidence.remove(uid, id);
                result = { removed: true };
              } else {
                const photo = await evidence.read(uid, id, false);
                res.setHeader("Content-Type", photo.type);
                res.end(Buffer.from(photo.bytes));
                return;
              }
            } else if (url.pathname === "/api/reports/receipt") {
              result = await reports.recover(
                uid,
                url.searchParams.get("draftKey"),
              );
              if (!result) {
                res.statusCode = 404;
                result = { error: "No receipt yet" };
              }
            } else if (url.pathname === "/api/reports/suggestions")
              result = {
                suggestions: await engagement.suggestDuplicates(
                  JSON.parse(body),
                ),
              };
            else if (url.pathname === "/api/reports" && req.method === "POST")
              result = await reports.submit({
                ...JSON.parse(body),
                residentUid: uid,
              });
            else if (url.pathname === "/api/reports")
              result = { reports: await reports.listMine(uid) };
            else if (url.pathname.endsWith("/engagement"))
              result = { affected: true };
            else {
              res.statusCode = 404;
              result = { error: "Unknown fixture request" };
            }
            res.end(JSON.stringify(result));
          } catch (error) {
            res.statusCode = error.status ?? 503;
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      },
    },
  ],
});
let browser;
try {
  await server.listen();
  let executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? chromium.executablePath();
  if (!executablePath && process.platform === "win32") {
    const cache = path.join(process.env.LOCALAPPDATA, "ms-playwright");
    const installed = (await readdir(cache).catch(() => []))
      .filter((name) => /^chromium-/.test(name))
      .sort()
      .at(-1);
    if (installed)
      executablePath = path.join(cache, installed, "chrome-win", "chrome.exe");
  }
  browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /Worker failed|Uncaught/.test(message.text())
    )
      errors.push(message.text());
  });
  await page.goto("http://127.0.0.1:4179/");
  await page.getByText("No photos yet.", { exact: false }).waitFor();
  await page
    .getByLabel("Category", { exact: true })
    .selectOption("streetlights");
  await page
    .getByLabel("Describe the concern", { exact: true })
    .fill("The streetlight beside the covered court is not working at night.");
  await page
    .getByLabel("Nearby landmark", { exact: true })
    .fill("Covered court");
  await page
    .getByLabel("I confirm this is not an emergency.", { exact: true })
    .check();
  await page.getByLabel(/I understand that only/).check();
  const photo = await sharp({
    create: { width: 180, height: 120, channels: 3, background: "#1f674b" },
  })
    .jpeg()
    .toBuffer();
  let interrupted = false;
  await page.route("**/api/evidence", async (route) => {
    if (route.request().method() !== "POST" || interrupted)
      return route.continue();
    interrupted = true;
    await route.fetch();
    await route.abort("failed");
  });
  await page.getByLabel("Choose photos").setInputFiles({
    name: "synthetic.jpg",
    mimeType: "image/jpeg",
    buffer: photo,
  });
  await page.getByText("Interrupted · retry", { exact: false }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Submit report", exact: true })
      .isDisabled(),
    true,
  );
  await page.reload();
  await page.getByRole("button", { name: "Resume draft" }).click();
  await page.getByText("Private · confirmed", { exact: false }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Submit report", exact: true })
      .isEnabled(),
    true,
  );
  await page.getByRole("button", { name: "Remove photo 1" }).click();
  await page.getByText("No photos yet.", { exact: false }).waitFor();
  await page.getByLabel("Choose photos").setInputFiles({
    name: "synthetic.jpg",
    mimeType: "image/jpeg",
    buffer: photo,
  });
  await page.getByText("Private · confirmed", { exact: false }).waitFor();
  for (const [name, width, height] of visualRound
    ? [
        ["desktop", 1440, 1000],
        ["tablet", 768, 1024],
        ["mobile", 390, 844],
      ]
    : []) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => scrollTo(0, 0));
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      name + " overflow",
    );
    await page.screenshot({
      path: path.join(artifacts, "intake-" + name + ".png"),
      fullPage: true,
    });
    await page.addScriptTag({
      path: path.join(root, "node_modules/axe-core/axe.min.js"),
    });
    const violations = await page.evaluate(async () =>
      (
        await window.axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        })
      ).violations.map((item) => ({ id: item.id, impact: item.impact })),
    );
    assert.deepEqual(violations, [], name + " accessibility");
  }
  await page.getByRole("button", { name: "Lumipat sa Filipino" }).click();
  await page
    .getByRole("heading", { name: "Ibahagi kung ano ang kailangang ayusin." })
    .waitFor();
  if (visualRound)
    await page.screenshot({
      path: path.join(artifacts, "intake-mobile-filipino.png"),
      fullPage: true,
    });
  await page.getByRole("button", { name: "Switch to English" }).click();
  await page.keyboard.press("Tab");
  assert.ok(
    await page.evaluate(() => document.activeElement !== document.body),
  );
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "200% text zoom overflow",
  );
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  // Real MapLibre, controlled raster tiles: no load test against volunteer servers.
  const tile = await sharp({
    create: { width: 256, height: 256, channels: 3, background: "#e5e9de" },
  })
    .png()
    .toBuffer();
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({ contentType: "image/png", body: tile }),
  );
  await page.getByRole("button", { name: "Open map", exact: true }).click();
  await page
    .getByText("Tap the location, or enter coordinates below.", { exact: true })
    .waitFor();
  await page
    .locator(".maplibregl-canvas")
    .click({ position: { x: 80, y: 80 } });
  assert.notEqual(
    await page.getByLabel("Latitude", { exact: true }).inputValue(),
    "",
  );
  assert.equal(
    await page
      .getByRole("link", { name: "OpenStreetMap contributors", exact: true })
      .count(),
    1,
  );
  // Coordinates produce a real privacy-safe duplicate choice.
  await page.getByLabel("Latitude", { exact: true }).fill("14.281");
  await page.getByLabel("Longitude", { exact: true }).fill("121.127");
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "This may already be reported" })
    .waitFor();
  await page
    .getByRole("button", { name: "Not related — continue with a new report" })
    .click();
  await page.getByLabel("Latitude", { exact: true }).fill("");
  await page.getByLabel("Longitude", { exact: true }).fill("");
  // Landmark-only submission after the map was optional and coordinates cleared.
  await page
    .getByRole("button", { name: "Submit report", exact: true })
    .click();
  await page.waitForFunction(() => window.__receipt === "/reports/AS-FIXTURE");
  const persisted = await (
    await page.request.get("http://127.0.0.1:4179/api/reports")
  ).json();
  assert.equal(persisted.reports.length, 1);
  assert.equal(persisted.reports[0].evidence.length, 1);
  assert.equal(persisted.reports[0].exactLocation, undefined);
  assert.deepEqual(errors, [], "Browser errors");
  console.log(
    "Verified photo preparation/storage boundary, lost-response recovery, preview/removal, EN/FIL, MapLibre with controlled tiles, duplicate choice, and landmark-only receipt." +
      (visualRound
        ? " Desktop/tablet/mobile axe, overflow, keyboard, reduced motion, and 200% text zoom passed."
        : " Functional-only run; visual checks were not repeated.") +
      " Firebase deployment remains a separate gate.",
  );
} finally {
  await browser?.close();
  await server.close();
}
