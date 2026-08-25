import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const manifestPath = path.join(root, "public", "assets", "asset-manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.assets)) throw new Error("invalid asset manifest");

const ids = new Set();
const urls = new Set();
for (const asset of manifest.assets) {
  if (!asset.id || !asset.url || !asset.purpose || !asset.version || !asset.reviewStatus) throw new Error(`incomplete asset: ${JSON.stringify(asset)}`);
  if (ids.has(asset.id) || urls.has(asset.url)) throw new Error(`duplicate asset identity: ${asset.id}`);
  ids.add(asset.id);
  urls.add(asset.url);
  await access(path.join(root, "public", asset.url.replace(/^\//, "")));
}

const actionFiles = await readdir(path.join(root, "public", "rehab-actions"));
for (const file of actionFiles.filter((name) => name.endsWith(".png"))) {
  const url = `/rehab-actions/${file}`;
  if (!urls.has(url)) throw new Error(`unregistered action asset: ${url}`);
}

console.log(`asset manifest: ok (${manifest.assets.length} assets)`);
