import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

// Fixed local-emulator target. Never accepts a hosted URL or real credentials.
const base = "http://127.0.0.1:3001";
const output = path.resolve(".scratch/qa-audit-2026-11-13/artifacts");
await mkdir(output, { recursive: true });
const services = await (await fetch("http://127.0.0.1:4400/emulators")).json();
for (const [name, port] of [["auth", 9099], ["firestore", 8080], ["storage", 9199]]) {
  assert.equal(services[name]?.host, "127.0.0.1");
  assert.equal(services[name]?.port, port);
}
const browser = await chromium.launch({ headless: true });
const findings = [];
try {
  for (const [role, routes] of [
    ["anonymous", ["/", "/sign-in", "/register", "/register/check-email", "/privacy", "/insights", "/pilot", "/account", "/moderation", "/administration"]],
    ["resident", ["/account", "/account/reports", "/account/notifications", "/account/privacy", "/reports/new", "/moderation", "/administration"]],
    ["owner", ["/account", "/account/reports", "/moderation", "/administration", "/administration/operations", "/administration/measurement"]],
  ]) {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    if (role !== "anonymous") {
      const auth = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=local-emulator-not-a-real-key", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: `local-${role}@example.test`, password: "LocalTestOnly-2026!", returnSecureToken: true }),
      });
      assert.ok(auth.ok);
      const { idToken } = await auth.json();
      const session = await context.request.post(base + "/api/session", { headers: { origin: base }, data: { idToken } });
      assert.equal(session.status(), 200);
    }
    const page = await context.newPage();
    for (const [locale, width] of [["en", 1440], ["fil", 390]]) {
      await context.addInitScript(value => localStorage.setItem("ayos-locale", value), locale);
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        const errors = [];
        const onError = error => errors.push(error.message);
        page.on("pageerror", onError);
        try {
          const response = await page.goto(base + route, { waitUntil: "networkidle", timeout: 60_000 });
          if (role === "anonymous" && ["/account", "/moderation", "/administration"].includes(route)) {
            await page.waitForURL("**/sign-in?**");
          }
          if (role === "resident" && ["/moderation", "/administration"].includes(route)) {
            await page.waitForURL("**/account");
          }
          await page.addScriptTag({ path: path.resolve("node_modules/axe-core/axe.min.js") });
          const metrics = await page.evaluate(async () => {
            const audit = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
            const overflow = document.documentElement.scrollWidth - innerWidth;
            const targets = [...document.querySelectorAll("a, button, input, select, summary")].filter(el => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && (rect.width < 24 || rect.height < 24);
            }).map(el => ({ text: (el.textContent || el.getAttribute("aria-label") || el.id).trim().slice(0, 70), width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) }));
            return { overflow, lang: document.documentElement.lang, title: document.title, headings: [...document.querySelectorAll("h1")].map(el => el.textContent), smallTargets: targets, violations: audit.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })) };
          });
          const record = { role, route, locale, width, status: response.status(), finalPath: new URL(page.url()).pathname, errors, ...metrics };
          findings.push(record);
          console.log(`${role} ${route} ${locale}: HTTP ${record.status}, overflow ${metrics.overflow}px, axe ${metrics.violations.length}, errors ${errors.length}`);
          await page.screenshot({ path: path.join(output, `${role}-${route.replaceAll("/", "_") || "home"}-${locale}.png`), fullPage: true });
        } catch (error) {
          findings.push({ role, route, locale, width, failure: error.message });
          console.log(`${role} ${route} ${locale}: CHECK FAILED ${error.message.slice(0, 160)}`);
        } finally { page.off("pageerror", onError); }
      }
    }
    await context.close();
  }
} finally {
  await writeFile(path.join(output, "live-route-audit.json"), JSON.stringify(findings, null, 2));
  await browser.close();
}
assert.equal(findings.filter(row => row.failure || row.status >= 400 || row.overflow > 0 || row.errors.length || row.violations.length).length, 0, "Review live-route-audit.json for failed visits.");
console.log(`PASS: ${findings.length} live route visits without runtime errors, horizontal overflow or automated WCAG violations.`);
