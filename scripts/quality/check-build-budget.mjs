import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "../..");
const dist = path.join(root, "dist");
const limits = Object.freeze({
  maxJavaScriptBytes: Number(process.env.REHABMIND_MAX_JS_ASSET_BYTES ?? 1024 * 1024),
  totalJavaScriptBytes: Number(process.env.REHABMIND_MAX_TOTAL_JS_BYTES ?? 4 * 1024 * 1024),
  maxCssBytes: Number(process.env.REHABMIND_MAX_CSS_ASSET_BYTES ?? 256 * 1024),
});

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(target));
    else if (entry.isFile()) files.push({ path: target, bytes: (await stat(target)).size });
  }
  return files;
}

const files = await collectFiles(dist);
const javascript = files.filter((file) => file.path.endsWith(".js"));
const css = files.filter((file) => file.path.endsWith(".css"));
const images = files.filter((file) => /\.(?:avif|gif|jpe?g|png|webp)$/i.test(file.path));
const maxBySize = (items) => items.reduce((largest, item) => item.bytes > (largest?.bytes ?? -1) ? item : largest, null);
const total = (items) => items.reduce((sum, item) => sum + item.bytes, 0);
const largestJavaScript = maxBySize(javascript);
const largestCss = maxBySize(css);
const largestImage = maxBySize(images);
const failures = [];
if (!javascript.length) failures.push("no JavaScript assets were produced");
if ((largestJavaScript?.bytes ?? 0) > limits.maxJavaScriptBytes) failures.push("largest JavaScript asset exceeds budget");
if (total(javascript) > limits.totalJavaScriptBytes) failures.push("total JavaScript assets exceed budget");
if ((largestCss?.bytes ?? 0) > limits.maxCssBytes) failures.push("largest CSS asset exceeds budget");

const relative = (file) => file ? path.relative(root, file.path).replaceAll("\\", "/") : null;
console.log(JSON.stringify({
  status: failures.length ? "failed" : "passed",
  limits,
  javascript: { count: javascript.length, totalBytes: total(javascript), largestBytes: largestJavaScript?.bytes ?? 0, largestPath: relative(largestJavaScript) },
  css: { count: css.length, totalBytes: total(css), largestBytes: largestCss?.bytes ?? 0, largestPath: relative(largestCss) },
  imageInventory: {
    excludedFromThisCodeBudget: true,
    reason: "Action and anatomy image replacement is tracked as a separate accepted work item.",
    count: images.length,
    totalBytes: total(images),
    largestBytes: largestImage?.bytes ?? 0,
    largestPath: relative(largestImage),
  },
  failures,
}, null, 2));
if (failures.length) process.exitCode = 1;
