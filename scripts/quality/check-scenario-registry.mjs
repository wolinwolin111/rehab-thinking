import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

// registry 校验（防手编 rot：JSON 语法/尾逗号、scenarioId 重复、script 路径失效、
// gateId 非法、releaseRequired 缺 gateId）。规则收窄，避开「script 存命令 / 多路径」
// 与「manual-task/vps-* 故意哨兵 gateId」这两类合法形态。
const root = path.resolve(import.meta.dirname, "../..");
const registryPath = path.join(root, "tests", "workflow", "scenario-registry.json");

const REAL_GATES = new Set([
  "fast", "workflow", "mutations", "component", "integration", "vertical",
  "security", "sqlite-health", "migration-compatibility", "dependencies",
  "performance", "lint", "browser-minimal",
]);
const SENTINEL_GATES = new Set(["manual-task", "vps-health", "vps-recovery"]);

const errors = [];
let raw;
try {
  raw = await readFile(registryPath, "utf8");
} catch (e) {
  console.error(`registry unreadable: ${e.message}`);
  process.exit(1);
}
let registry;
try {
  registry = JSON.parse(raw);
} catch (e) {
  console.error(`registry JSON invalid (语法/尾逗号?): ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(registry)) { console.error("registry must be an array"); process.exit(1); }

const seen = new Set();
for (const entry of registry) {
  const id = entry.scenarioId ?? "(缺 scenarioId)";
  if (!entry.scenarioId) errors.push(`${id}: 缺 scenarioId`);
  if (seen.has(entry.scenarioId)) errors.push(`${id}: scenarioId 重复`);
  seen.add(entry.scenarioId);

  // script 仅当「单个 tests/ 路径」时校验存在（跳过 `npm run ...` 命令与 `a; b` 多路径）
  const script = entry.script;
  if (typeof script === "string" && /^tests\/[^;\s]+$/.test(script) && !existsSync(path.join(root, script))) {
    errors.push(`${id}: script 路径不存在 → ${script}`);
  }

  const gate = entry.gateId;
  if (gate !== undefined && gate !== null && !REAL_GATES.has(gate) && !SENTINEL_GATES.has(gate)) {
    errors.push(`${id}: gateId 非法 → ${gate}`);
  }
  if (entry.releaseRequired === true && !gate) {
    errors.push(`${id}: releaseRequired=true 但缺 gateId`);
  }
}

if (errors.length) {
  console.error(`scenario-registry errors (${errors.length}):\n${errors.join("\n")}`);
  process.exit(1);
}
console.log(`scenario-registry: ok (${registry.length} entries)`);
