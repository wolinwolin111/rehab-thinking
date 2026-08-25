import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["README.md", "app", "docs", "scripts", "tests"];

async function markdownFiles(target) {
  const absolute = path.join(root, target);
  const entries = await readdir(absolute, { withFileTypes: true }).catch(() => null);
  if (!entries) return target.endsWith(".md") ? [absolute] : [];
  const files = [];
  for (const entry of entries) {
    const child = path.join(absolute, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(path.relative(root, child)));
    else if (entry.name.endsWith(".md")) files.push(child);
  }
  return files;
}

function localTargets(source) {
  const withoutFences = source.replace(/```[\s\S]*?```/g, "");
  const targets = [];
  for (const match of withoutFences.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
    let value = match[1].trim();
    if (value.startsWith("<") && value.endsWith(">")) value = value.slice(1, -1);
    if (!value || /^(?:https?:|mailto:|tel:|data:|#)/i.test(value)) continue;
    value = decodeURIComponent(value.split("#", 1)[0].split("?", 1)[0]);
    if (value) targets.push(value);
  }
  return targets;
}

const missing = [];
const files = (await Promise.all(scanRoots.map(markdownFiles))).flat();
for (const file of files) {
  const source = await readFile(file, "utf8");
  for (const target of localTargets(source)) {
    const absolute = path.resolve(path.dirname(file), target);
    await access(absolute).catch(() => missing.push(`${path.relative(root, file)} -> ${target}`));
  }
}

if (missing.length) {
  console.error(`markdown links missing (${missing.length}):\n${missing.join("\n")}`);
  process.exit(1);
}
console.log(`markdown links: ok (${files.length} files)`);
