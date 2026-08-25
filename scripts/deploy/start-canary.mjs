import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const [releaseDir, port, databasePath] = process.argv.slice(2);
if (!releaseDir || !port || !databasePath) {
  console.error("usage: node start-canary.mjs <release-dir> <port> <database-path>");
  process.exit(2);
}
const env = { ...process.env };
for (const line of readFileSync(path.join(releaseDir, ".env"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Za-z0-9_]+)=(.*)\s*$/);
  if (match) env[match[1]] = match[2];
}
env.PORT = port;
env.PILOT_SQLITE_PATH = databasePath;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const child = spawn(npmCommand, ["run", "start"], { cwd: releaseDir, env, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
