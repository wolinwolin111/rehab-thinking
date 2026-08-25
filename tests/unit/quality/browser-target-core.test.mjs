import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const target = await loadTypeScriptModule("./tests/browser/support/browser-target.ts");

test("A7 TEST-15: Playwright preserves the /RehabMind/ deployment prefix", () => {
  const base = target.resolveBrowserTarget("https://66.154.101.204/RehabMind");
  assert.equal(base, "https://66.154.101.204/RehabMind/");
  assert.equal(new URL("./", base).pathname, "/RehabMind/");
  assert.equal(target.isLocalBrowserTarget(base), false);
  assert.equal(target.isLocalBrowserTarget("http://localhost:3000/"), true);
});
