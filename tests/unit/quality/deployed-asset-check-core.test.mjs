import assert from "node:assert/strict";
import test from "node:test";
import { assertCriticalAssetResponse, extractCriticalAssetPaths } from "../../../scripts/quality/deployed-asset-check-core.mjs";

test("A7 DEPLOY-02: deployed HTML exposes concrete CSS and JavaScript assets", () => {
  assert.deepEqual(extractCriticalAssetPaths(`
    <link rel="stylesheet" href="/_next/static/app.css">
    <script src="/_next/static/app.js"></script>
  `), { css: "/_next/static/app.css", javascript: "/_next/static/app.js" });
});

test("A7 DEPLOY-02: HTML or the wrong MIME type cannot impersonate a static asset", () => {
  assert.throws(() => assertCriticalAssetResponse({ kind: "css", status: 200, contentType: "text/html", bodyPrefix: "<!DOCTYPE html>" }), /CSS asset returned/);
  assert.throws(() => assertCriticalAssetResponse({ kind: "javascript", status: 200, contentType: "text/html", bodyPrefix: "<!DOCTYPE html>" }), /JavaScript asset returned/);
  assert.doesNotThrow(() => assertCriticalAssetResponse({ kind: "css", status: 200, contentType: "text/css", bodyPrefix: ".rm-app{" }));
  assert.doesNotThrow(() => assertCriticalAssetResponse({ kind: "javascript", status: 200, contentType: "application/javascript", bodyPrefix: "const app=" }));
});
