import assert from "node:assert/strict";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { createServer, transformWithOxc } from "vite";

const root = process.cwd(), output = path.join(root, ".scratch/sign-in-layout/artifacts");
await mkdir(output, { recursive: true });
const fixture = `import React from 'react';import {createRoot} from 'react-dom/client';import {AuthPanel} from '/src/features/auth/auth-panel.tsx';import {ProductNavigation} from '/src/features/navigation/product-navigation.tsx';import '/src/app/globals.css';createRoot(document.body).render(<><ProductNavigation signedIn={false}/><AuthPanel mode={location.search.includes('register')?'register':'sign-in'}/></>);`;
const server = await createServer({ root, configFile: false, resolve: { alias: { "@": path.join(root, "src") } }, oxc: { jsx: { runtime: "automatic" } }, define: { "process.env": "{}" }, optimizeDeps: { exclude: ["next/link", "next/navigation"] }, server: { host: "127.0.0.1", port: 4189, strictPort: true, watch: { ignored: ["**/.next/**", "**/.scratch/**"] } }, plugins: [{ name: "sign-in-fixture", enforce: "pre", resolveId(id) { if (["/__auth.jsx", "next/link", "next/navigation"].includes(id)) return "\0" + id; }, async load(id) {
  if (id === "\0next/link") return "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}";
  if (id === "\0next/navigation") return "export const useRouter=()=>({push(){},refresh(){}});export const usePathname=()=>'/sign-in';";
  if (id === "\0/__auth.jsx") return (await transformWithOxc(fixture, "fixture.tsx", { lang: "tsx", jsx: { runtime: "automatic" } })).code;
}, configureServer(vite) { vite.middlewares.use((req, res, next) => { if (!req.url.startsWith("/sign-in") && !req.url.startsWith("/register")) return next(); res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html lang="en"><head><title>Sign in verification</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><script type="module" src="/__auth.jsx"></script></body></html>'); }); } }] });
let browser;
try {
  await server.listen(); browser = await chromium.launch({ headless: true });
  for (const locale of ["en", "fil"]) for (const [name, width, height] of [["desktop",1440,900],["laptop",1366,768],["tablet",768,1024],["phone",390,844],["small-phone",375,667],["compact-phone",320,568],["landscape",844,390]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.addInitScript(value => localStorage.setItem("ayos-locale", value), locale);
    await page.goto("http://127.0.0.1:4189/sign-in"); await page.locator("#sign-in-email").waitFor();
    const metrics = await page.evaluate(() => { const wrap=document.querySelector('.auth-form-wrap');return { page:document.documentElement.scrollHeight, viewport:innerHeight, width:document.documentElement.scrollWidth, form:wrap.scrollHeight, available:wrap.clientHeight }; });
    assert.ok(metrics.page <= height, `${name}/${locale}: page scroll ${JSON.stringify(metrics)}`);
    assert.ok(metrics.width <= width, `${name}/${locale}: horizontal overflow`);
    if (height >= 568) assert.ok(metrics.form <= metrics.available + 1, `${name}/${locale}: form scroll ${JSON.stringify(metrics)}`);
    await page.locator("#sign-in-email").fill("synthetic@example.test"); await page.locator("#sign-in-password").fill("synthetic-pass-123");
    const button = page.locator(".auth-submit"); await button.scrollIntoViewIfNeeded(); await button.click();
    await page.getByRole("alert").filter({ hasText: locale === "en" ? "That did not work" : "Hindi natuloy" }).waitFor();
    await button.scrollIntoViewIfNeeded(); assert.ok(await button.isVisible());
    assert.equal(await page.locator(".brand-light").count(),0);
    if (["desktop","phone","compact-phone"].includes(name)) await page.screenshot({ path: path.join(output, `${name}-${locale}.png`), fullPage: true });
    await page.close();
  }
  console.log("Sign-in fits desktop, laptop, tablet and phone without page scrolling in English and Filipino; short-screen form and error remain accessible.");
} finally { await browser?.close(); await server.close(); }
