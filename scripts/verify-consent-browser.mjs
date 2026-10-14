import assert from "node:assert/strict";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { createServer, transformWithOxc } from "vite";
const root = process.cwd(), output = path.join(root, ".impeccable/review/consent");
await mkdir(output, { recursive: true });
const fixture = `
import React from "react";
import {createRoot} from "react-dom/client";
import {ResidentPanel} from "/src/features/auth/resident-panel.tsx";
import {createAdministrationModule,createMemoryAdministrationStore} from "/src/features/admin/administration-module.ts";
import {consentVersion} from "/src/features/pilot/participation-consent.ts";
import "/src/app/globals.css";
const resident={uid:"synthetic-resident",emailVerified:true};
const administration=createAdministrationModule({store:createMemoryAdministrationStore({users:[{uid:resident.uid,roles:["Resident"],access:"approved"}]})});
window.fetch=async(url,options={})=>{
 if(String(url)!=="/api/participation") throw Error("Unexpected synthetic request");
 if(options.method==="POST"){
   const receipt=await administration.acceptConsent(resident,JSON.parse(options.body));
   if(window.__loseAcknowledgement) throw TypeError("Synthetic acknowledgement lost after commit");
   return Response.json({receipt});
 }
 return Response.json({eligible:!window.__unapproved && await administration.canEnroll(resident),receipt:await administration.getConsent(resident),version:consentVersion});
};
createRoot(document.getElementById("root")).render(<ResidentPanel publicAlias="Synthetic neighbor" approved/>);
`;
const server = await createServer({ cacheDir: path.join(root, "node_modules/.vite", "verify-consent-browser"),
  root, configFile: false, server: { watch: { ignored: ["**/.next/**", "**/.next-local/**", "**/.scratch/**"] }, host: "127.0.0.1", port: 4190, strictPort: true },
  optimizeDeps: { exclude: ["next/link", "next/navigation"] },
  resolve: { alias: { "@": path.join(root, "src") } }, oxc: { jsx: { runtime: "automatic" } }, define: { "process.env": "{}" },
  plugins: [{
    name: "consent-synthetic-fixture", enforce: "pre",
    resolveId(id) { if (["/__consent.jsx", "next/link", "next/navigation"].includes(id)) return "\0" + id; },
    async load(id) {
      if (id === "\0next/link") return "import React from 'react'; export default function Link({children,...props}){return React.createElement('a',props,children)}";
      if (id === "\0next/navigation") return "export const useRouter=()=>({push:()=>{},refresh:()=>{}})";
      if (id === "\0/__consent.jsx") return (await transformWithOxc(fixture, "fixture.tsx", { lang: "tsx", jsx: { runtime: "automatic" } })).code;
    },
    configureServer(vite) { vite.middlewares.use((req, res, next) => {
      if (req.url !== "/") return next();
      res.setHeader("Content-Type", "text/html");
      res.end('<!doctype html><html lang="en"><head><title>Synthetic consent verification</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script>window.process={env:{NODE_ENV:"development"}}</script><script type="module" src="/@vite/client"></script><script type="module" src="/__consent.jsx"></script></body></html>');
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
  await page.goto("http://127.0.0.1:4190/");
  await page.getByText("No participation consent is recorded yet.", { exact: true }).waitFor();
  async function capture(name, width = 390, height = 844, forced = false) {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: forced ? "active" : "none" });
    await page.evaluate(() => window.scrollTo(0, 0));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + " overflow");
    await page.screenshot({ path: path.join(output, name + ".png"), fullPage: true });
    await page.addScriptTag({ path: path.join(root, "node_modules/axe-core/axe.min.js") });
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.map(item => ({ id: item.id, impact: item.impact })));
    assert.deepEqual(violations, [], name + " axe");
  }
  await capture("account-desktop", 1440, 1000); await capture("account-tablet", 768, 1024); await capture("account-mobile");
  await capture("account-zoom400", 360, 800); await capture("account-forced-colors", 360, 800, true);
  await page.emulateMedia({ forcedColors: "none" }); await page.keyboard.press("Tab");
  assert.ok(await page.evaluate(() => document.activeElement !== document.body));
  await page.getByRole("button", { name: "Filipino", exact: true }).click();
  await page.getByRole("heading", { name: "Piliin kung sasali sa pilot", exact: true }).waitFor();
  await capture("account-filipino");
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("button", { name: "Agree and save my consent", exact: true }).click();
  await page.getByText("Acknowledge adulthood and voluntary consent before agreeing.", { exact: true }).waitFor();
  await page.getByLabel("I acknowledge that I am at least 18 years old", { exact: true }).check();
  await page.getByLabel("I understand this disclosure and voluntarily agree to participate", { exact: true }).check();
  await page.evaluate(() => window.__loseAcknowledgement = true);
  await page.getByRole("button", { name: "Agree and save my consent", exact: true }).click();
  await page.getByText(/Consent could not be confirmed/).waitFor();
  assert.equal(await page.getByRole("button", { name: "I do not wish to participate", exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole("heading", { name: "Your private consent receipt", exact: true }).count(), 0);
  await capture("account-offline");
  await page.getByRole("button", { name: "Reload private participation status", exact: true }).click();
  await page.getByRole("heading", { name: "Your private consent receipt", exact: true }).waitFor();
  assert.equal(await page.getByRole("link", { name: "Continue to report", exact: true }).getAttribute("href"), "/reports/new");
  await capture("account-receipt");
  await page.reload(); await page.getByText("No participation consent is recorded yet.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "I do not wish to participate", exact: true }).click();
  await page.getByText(/You have not joined/).waitFor(); await capture("account-declined");
  assert.equal(await page.getByRole("link", { name: "Privacy and my data", exact: true }).getAttribute("href"), "/account/privacy");
  await page.getByRole("button", { name: "Review my choice again", exact: true }).click();
  await page.evaluate(() => window.__unapproved = true);
  await page.getByRole("button", { name: "Reload private participation status", exact: true }).click();
  await page.getByText(/A verified invited or approved account is required/).waitFor();
  assert.equal(await page.getByLabel("I acknowledge that I am at least 18 years old", { exact: true }).isDisabled(), true);
  await capture("account-permission");
  assert.deepEqual(errors, []);
  console.log("PASS: synthetic consent/decline, adult choice, lost acknowledgement/private receipt recovery; EN/FIL, desktop/tablet/mobile/400%-equivalent reflow, forced colors, reduced motion, keyboard and axe. Not deployed or human screen-reader evidence.");
} finally { await browser?.close(); await server.close(); }
