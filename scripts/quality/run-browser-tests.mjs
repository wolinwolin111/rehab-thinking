import { mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const [label, ...playwrightArgs] = process.argv.slice(2);
if (!label || label.startsWith("-")) {
  console.error("Usage: node scripts/run-browser-tests.mjs <label> <playwright args...>");
  process.exit(2);
}

const artifactsDir = process.env.QUALITY_ARTIFACTS_DIR ?? path.join("artifacts", "quality", "playwright", label);
await mkdir(artifactsDir, { recursive: true });

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(command, ["playwright", "test", ...playwrightArgs], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, QUALITY_ARTIFACTS_DIR: artifactsDir },
});

child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
