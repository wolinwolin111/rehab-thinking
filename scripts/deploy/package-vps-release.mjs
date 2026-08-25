import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { sameQualityIdentity } from "../quality/quality-evidence-core.mjs";
import { readQualityRunIdentity } from "../quality/quality-run-identity.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const identity = await readQualityRunIdentity(root);
const pointer = JSON.parse(await readFile(path.join(root, "artifacts", "quality", "current-run.json"), "utf8"));
const qualityManifest = JSON.parse(await readFile(path.join(root, pointer.manifestPath), "utf8"));
if (qualityManifest.runId !== pointer.runId || qualityManifest.status !== "passed" || !sameQualityIdentity(qualityManifest.identity, identity)) {
  throw new Error("release package requires a passed local quality run for the current build identity");
}
const outputDir = path.join(root, "artifacts", "quality", pointer.runId, "release");
await mkdir(outputDir, { recursive: true });

const trackedAndUntracked = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { cwd: root, encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const denied = /(^|\/)(\.env(?:\..*)?|\.dev\.vars|\.preview-admin-key|\.tmp-deploy-secrets\.txt)$|\.(pem|pfx|key)$|\.(?:sqlite|db)(?:-(?:wal|shm))?$/i;
const sourceFiles = [];
for (const file of trackedAndUntracked.sort()) {
  if (denied.test(file) || file.startsWith("artifacts/") || file.startsWith("dist/") || file.startsWith("node_modules/")) continue;
  if ((await stat(path.join(root, file)).catch(() => null))?.isFile()) sourceFiles.push(file);
}
for (const required of ["package.json", "package-lock.json", "src/infrastructure/pilot/release/release.generated.ts", "scripts/deploy/vps-release.sh"]) {
  if (!sourceFiles.includes(required)) throw new Error(`release source is missing ${required}`);
}
const fileListPath = path.join(outputDir, "source-files.txt");
await writeFile(fileListPath, `${sourceFiles.join("\n")}\n`, "utf8");
const codeTar = path.join(outputDir, "rehabmind-code.tar");
const distTar = path.join(outputDir, "rehabmind-dist.tar.gz");
for (const result of [
  spawnSync("tar", ["-cf", codeTar, "-T", fileListPath], { cwd: root, encoding: "utf8" }),
  spawnSync("tar", ["-czf", distTar, "dist"], { cwd: root, encoding: "utf8" }),
]) {
  if (result.status !== 0) throw new Error(result.stderr || "tar failed");
}
async function sha256(file) {
  return createHash("sha256").update(await readFile(file)).digest("hex");
}
const packageManifest = {
  createdAt: new Date().toISOString(),
  runId: pointer.runId,
  identity,
  sourceFileCount: sourceFiles.length,
  files: {
    "rehabmind-code.tar": { sha256: await sha256(codeTar), bytes: (await stat(codeTar)).size },
    "rehabmind-dist.tar.gz": { sha256: await sha256(distTar), bytes: (await stat(distTar)).size },
  },
};
await writeFile(path.join(outputDir, "release-package.json"), `${JSON.stringify(packageManifest, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ outputDir: path.relative(root, outputDir), ...packageManifest }, null, 2));
