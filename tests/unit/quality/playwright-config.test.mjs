import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

test("TEST-15: Playwright baseURL preserves a deployed pathname", async () => {
  const previous = process.env.WALKTHROUGH_URL;
  process.env.WALKTHROUGH_URL = "https://example.test/RehabMind/";
  try {
    const config = await loadTypeScriptModule("./playwright.config.ts", {
      transformSource(file, source) {
        return file.endsWith("playwright.config.ts")
          ? source.replace(
            'import { defineConfig, devices } from "@playwright/test";',
            'const defineConfig = (value) => value; const devices = { "Desktop Chrome": {} };',
          )
          : source;
      },
    });
    assert.equal(config.default.use.baseURL, "https://example.test/RehabMind/");
    assert.equal(config.default.webServer, undefined);
  } finally {
    if (previous === undefined) delete process.env.WALKTHROUGH_URL;
    else process.env.WALKTHROUGH_URL = previous;
  }
});
