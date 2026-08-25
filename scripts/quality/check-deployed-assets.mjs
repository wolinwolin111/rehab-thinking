import { assertCriticalAssetResponse, extractCriticalAssetPaths } from "./deployed-asset-check-core.mjs";

const appUrl = process.argv[2];
const baseUrl = process.argv[3];
if (!appUrl || !baseUrl) {
  console.error("usage: node check-deployed-assets.mjs <app-url> <base-url>");
  process.exit(2);
}

const page = await fetch(appUrl);
if (!page.ok) throw new Error(`deployed page returned HTTP ${page.status}`);
const assets = extractCriticalAssetPaths(await page.text());
for (const [kind, assetPath] of [["css", assets.css], ["javascript", assets.javascript]]) {
  const response = await fetch(new URL(assetPath, baseUrl));
  const body = await response.text();
  assertCriticalAssetResponse({
    kind,
    status: response.status,
    contentType: response.headers.get("content-type"),
    bodyPrefix: body.slice(0, 80),
  });
  console.log(`${kind}_asset=passed path=${assetPath} bytes=${Buffer.byteLength(body)}`);
}
