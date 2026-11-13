import assert from "node:assert/strict";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { createServer, transformWithOxc } from "vite";

const root = process.cwd();
const artifacts = path.join(
  root,
  ".scratch/simplified-product-flow/artifacts",
);
await mkdir(artifacts, { recursive: true });
const fixture = `
import React from "react";
import { createRoot } from "react-dom/client";
import { AdministrationWorkspace } from "/src/features/admin/administration-workspace.tsx";
import { ProductNavigation } from "/src/features/navigation/product-navigation.tsx";
import { createAdministrationModule, createMemoryAdministrationStore } from "/src/features/admin/administration-module.ts";
import "/src/app/globals.css";
const actor = { uid: "admin", roles: ["Administrator"] };
const administration = createAdministrationModule({ store: createMemoryAdministrationStore({ users: [
  { uid: "admin", publicAlias: "Pilot steward", email: "steward@example.test", emailVerified: true, roles: ["Resident", "Administrator"] },
  { uid: "neighbor", publicAlias: "Court neighbor", email: "neighbor@example.test", emailVerified: true, roles: ["Resident"] }
] }) });
const snapshot = async () => ({ users: await administration.listUsers(actor), configuration: await administration.getConfiguration(actor), invitations: await administration.listInvitations(actor), audit: await administration.listAudit(actor) });
window.fetch = async (url, options = {}) => {
  if (String(url) !== "/api/administration") throw new Error("Unexpected fixture request");
  if (options.method === "PATCH") {
    const { action, input } = JSON.parse(options.body);
    try {
      if (action === "set-invitation") await administration.setInvitation(actor, input);
      else if (action === "set-access") await administration.setAccess(actor, input);
      else if (action === "set-roles") await administration.setRoles(actor, input);
      else if (action === "update-configuration") await administration.updateConfiguration(actor, input);
      return Response.json({ ok: true });
    } catch (error) { return Response.json({ error: error.message, code: error.code }, { status: 422 }); }
  }
  return Response.json(await snapshot());
};
createRoot(document.getElementById("root")).render(<><ProductNavigation roles={actor.roles} signedIn /><AdministrationWorkspace initial={await snapshot()} /></>);
`;
const server = await createServer({ cacheDir: path.join(root, "node_modules/.vite", "verify-administration-browser"),
  root,
  configFile: false,
  server: { watch: { ignored: ["**/.next/**", "**/.next-local/**", "**/.scratch/**"] }, host: "127.0.0.1", port: 4178, strictPort: true },
  resolve: { alias: { "@": path.join(root, "src") } },
  oxc: { jsx: { runtime: "automatic" } },
  define: { "process.env": "{}" },
  plugins: [
    {
      name: "administration-verification-fixture",
      resolveId(id) {
        if (id === "/__admin_fixture.jsx") return "\0admin-fixture.jsx";
        if (id === "next/navigation") return "\0navigation-fixture.js";
      },
      async load(id) {
        if (id === "\0navigation-fixture.js") return 'export const usePathname = () => "/administration";';
        if (id === "\0admin-fixture.jsx")
          return (
            await transformWithOxc(fixture, "fixture.tsx", {
              lang: "tsx",
              jsx: { runtime: "automatic" },
            })
          ).code;
      },
      configureServer(vite) {
        vite.middlewares.use((req, res, next) => {
          if (req.url !== "/") return next();
          res.setHeader("Content-Type", "text/html");
          res.end(
            '<!doctype html><html lang="en"><head><title>Administration verification</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/@vite/client"></script><script type="module" src="/__admin_fixture.jsx"></script></body></html>',
          );
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
    const entries = await readdir(cache).catch(() => []);
    const installed = entries
      .filter((name) => /^chromium-/.test(name))
      .sort()
      .at(-1);
    if (installed)
      executablePath = path.join(cache, installed, "chrome-win", "chrome.exe");
  }
  browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => {
    errors.push(error.message);
    console.error(error.message);
  });
  await page.goto("http://127.0.0.1:4178/");
  await page
    .getByRole("heading", { name: "Pilot administration", exact: true })
    .waitFor();
  await page
    .getByLabel("Email address", { exact: true })
    .fill("invited@example.test");
  await page
    .getByLabel("Invitation reason", { exact: true })
    .fill("Invited participant");
  await page
    .getByRole("button", { name: "Invite resident", exact: true })
    .click();
  await page.getByText("Changes saved.", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByText("invited@example.test · Active", { exact: true })
      .count(),
    1,
  );
  const person = page
    .locator("article")
    .filter({
      has: page.getByRole("heading", { name: "Court neighbor", exact: true }),
    });
  await person.getByLabel("Access decision").selectOption("approved");
  await person.getByLabel("Access reason").fill("Approved participant");
  await person.getByRole("button", { name: "Save access" }).click();
  await page.getByText("Changes saved.", { exact: true }).waitFor();
  await person.getByLabel("Administrator", { exact: true }).check();
  await person.getByLabel("Role change reason").fill("Backup administrator");
  await person.getByRole("button", { name: "Save roles" }).click();
  await page.getByRole("button", { name: "Advanced settings", exact: true }).click();
  await page
    .getByText("Two administrator accounts are verified;", { exact: false })
    .waitFor();
  await page
    .getByLabel("English label", { exact: true })
    .first()
    .fill("Roads and drainage pilot");
  await page
    .getByLabel("Configuration change reason")
    .fill("Updated routing labels");
  await page.getByRole("button", { name: "Save configuration" }).click();
  await page.getByText("Changes saved.", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByLabel("English label", { exact: true })
      .first()
      .inputValue(),
    "Roads and drainage pilot",
  );
  await page.getByRole("button", { name: "Advanced settings", exact: true }).click();
  assert.equal(await page.getByRole("heading", { name: "Audit history", exact: true }).isVisible(), false);
  assert.equal(await page.getByRole("navigation", { name: "Primary navigation", exact: true }).getByRole("link").count(), 5);
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["tablet", 768, 1024],
    ["mobile", 390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const link of await page.getByRole("navigation", { name: "Primary navigation", exact: true }).getByRole("link").all()) {
      assert.equal(await link.isVisible(), true, name + " primary destination is visible");
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      name + " overflow",
    );
    await page.screenshot({
      path: path.join(artifacts, "administration-" + name + ".png"),
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
  await page.getByRole("button", { name: "Filipino", exact: true }).click();
  await page
    .getByRole("heading", { name: "Pamamahala ng pilot", exact: true })
    .waitFor();
  await page.screenshot({
    path: path.join(artifacts, "administration-mobile-filipino.png"),
    fullPage: true,
  });
  await page.keyboard.press("Tab");
  assert.ok(
    await page.evaluate(() => document.activeElement !== document.body),
  );
  assert.deepEqual(errors, [], "Browser errors");
  console.log(
    "Verified administration invitation, access, roles, configuration, EN/FIL, desktop/tablet/mobile, keyboard focus, and automated accessibility with synthetic data.",
  );
} finally {
  await browser?.close();
  await server.close();
}
