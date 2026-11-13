import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { createServer, transformWithOxc } from "vite";

const root = process.cwd(), artifacts = path.join(root, ".scratch/report-archiving/artifacts");
await mkdir(artifacts, { recursive: true });
const fixture = `import React from 'react';import {createRoot} from 'react-dom/client';import {RemovalRequestQueue} from '/src/features/reports/removal-request-queue.tsx';import '/src/app/globals.css';createRoot(document.getElementById('root')).render(<main className="admin-page operator-page"><section className="admin-shell"><h1>Report operations</h1><RemovalRequestQueue /></section></main>);`;
const server = await createServer({ root, configFile: false, resolve: { alias: { "@": path.join(root, "src") } }, oxc: { jsx: { runtime: "automatic" } }, define: { "process.env": "{}" }, optimizeDeps: { exclude: ["next/link"] }, server: { host: "127.0.0.1", port: 4187, strictPort: true, watch: { ignored: ["**/.next/**", "**/.scratch/**"] } }, plugins: [{ name: "archive-fixture", enforce: "pre", resolveId(id) { if (["/__archive.jsx", "next/link"].includes(id)) return "\0" + id; }, async load(id) {
  if (id === "\0next/link") return "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}";
  if (id === "\0/__archive.jsx") return (await transformWithOxc(fixture, "fixture.tsx", { lang: "tsx", jsx: { runtime: "automatic" } })).code;
}, configureServer(vite) { vite.middlewares.use((req, res, next) => { if (req.url !== "/") return next(); res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html lang="en"><head><title>Archive verification</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/__archive.jsx"></script></body></html>'); }); } }] });
let browser;
try {
  await server.listen(); browser = await chromium.launch({ headless: true });
  for (const [name, width, height, locale] of [["desktop", 1440, 1000, "en"], ["phone", 390, 844, "en"], ["phone-fil", 390, 844, "fil"]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.addInitScript(value => localStorage.setItem("ayos-locale", value), locale);
    let archived = false, fail = true;
    await page.route("**/api/report-requests", async route => {
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON(); assert.equal(body.reference, "AS-TEST01"); assert.equal(body.reason, "Resident requested privacy.");
        if (fail) return route.fulfill({ status: 503, json: { code: "UNAVAILABLE" } });
        archived = true; return route.fulfill({ json: { status: "archived" } });
      }
      return route.fulfill({ json: { requests: archived ? [] : [{ reference: "AS-TEST01", createdAt: "2026-11-13T00:00:00Z" }], nextCursor: null } });
    });
    await page.goto("http://127.0.0.1:4187");
    await page.locator("summary").click();
    const reason = page.getByRole("textbox"); await reason.fill("Resident requested privacy.");
    await page.screenshot({ path: path.join(artifacts, `${name}.png`), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const button = page.getByRole("button", { name: locale === "fil" ? "I-archive ang ulat" : "Archive report", exact: true });
    await button.click(); await page.getByRole("alert").waitFor(); assert.equal(await reason.inputValue(), "Resident requested privacy.");
    fail = false; await button.click(); await page.getByRole("status").waitFor();
    assert.equal(await page.getByRole("link", { name: "AS-TEST01" }).count(), 0);
    await page.close();
  }
  console.log("Archive button verified on desktop and phone in English and Filipino, including failed-request recovery.");
} finally { await browser?.close(); await server.close(); }
