import { spawn, spawnSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * 测试侧一键回归编排器（agent/testing 专用）。
 *
 * 链式执行：test:fast → check:knowledge →（起 3001 dev server）→ browser full
 * → overall → mobile-preview →（收尾停服），从输出提取 passed/failed/skipped
 * 与 node:test pass/fail 计数，产出紧凑判决 + manifest，绑定当前 commit。
 *
 * 纪律内置：
 * - 逻辑层先跑（test:fast 的 build 会重写 release.generated.ts，此时 server 未起，
 *   规避 vite watcher EBUSY）；浏览器阶段期间不得编辑 worktree 文件。
 * - 3001 已有服务则复用且不负责停止；自起的服务按端口定位后 taskkill /T 杀进程树。
 * - 判绿以计数行为准（failed>0 即红），退出码兜底；fixme 计 skipped。
 *
 * 用法：node scripts/quality/run-test-regression.mjs [--workers=N] [--only=a,b] [--skip=a,b] [--all]
 *   套件 id：fast | knowledge | full | overall | mobile。
 *   默认遇红即停（门禁模式）；--all 跑完全部再汇总（摸底模式）。
 */

const root = path.resolve(import.meta.dirname, "../..");
const argv = process.argv.slice(2);
const flagValue = (name) => {
  const inline = argv.find((arg) => arg.startsWith(`--${name}=`));
  return inline ? inline.slice(inline.indexOf("=") + 1) : undefined;
};
const workers = flagValue("workers");
const runAll = argv.includes("--all");
const only = flagValue("only")?.split(",").map((s) => s.trim()).filter(Boolean);
const skip = new Set(flagValue("skip")?.split(",").map((s) => s.trim()).filter(Boolean) ?? []);

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}/`;
const serverLog = path.join(root, ".tmp", "dev-server-3001.log");
const runId = `reg-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${process.pid}`;
const runDir = path.join(root, "artifacts", "quality", "regression", runId);
const logsDir = path.join(runDir, "logs");
await mkdir(logsDir, { recursive: true });

function git(args, fallback = "unknown") {
  const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() || fallback : fallback;
}
const commit = git(["rev-parse", "HEAD"]);

/** 从混合输出提取计数：playwright 的 N passed/failed/skipped 与 node:test 的 ℹ pass/fail。 */
function extractCounts(text) {
  const last = (re) => {
    let found = null;
    for (const m of text.matchAll(re)) found = Number(m[1]);
    return found;
  };
  return {
    passed: last(/\b(\d+) passed\b/g),
    failed: last(/\b(\d+) failed\b/g),
    skipped: last(/\b(\d+) skipped\b/g),
    nodePass: last(/ℹ pass (\d+)/g),
    nodeFail: last(/ℹ fail (\d+)/g),
  };
}

async function npmRun(suite) {
  const extraArgs = suite.needsServer && workers ? [`--workers=${workers}`] : [];
  const started = Date.now();
  const result = spawnSync("npm", ["run", suite.script, ...(extraArgs.length ? ["--", ...extraArgs] : [])], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 25 * 60 * 1000,
    env: { ...process.env, WALKTHROUGH_URL: BASE_URL },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  // 日志名用套件 id：script 含冒号（test:browser:full），Windows 文件名非法。
  await writeFile(path.join(logsDir, `${suite.id}.log`), output, "utf8");
  return {
    exitCode: result.status ?? 1,
    durationMs: Date.now() - started,
    timedOut: result.error?.code === "ETIMEDOUT",
    counts: extractCounts(output),
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function probeServer() {
  const r = spawnSync("node", ["-e", "fetch(process.argv[1]).then((res)=>process.exit(res.status===200?0:1)).catch(()=>process.exit(1))", BASE_URL], { timeout: 15_000 });
  return r.status === 0;
}

function portOwnerPid() {
  const netstat = spawnSync("netstat", ["-ano", "-p", "TCP"], { encoding: "utf8" });
  const line = (netstat.stdout ?? "").split(/\r?\n/).find((l) => new RegExp(`:${PORT}\\s`).test(l) && l.includes("LISTENING"));
  return line ? Number(line.trim().split(/\s+/).at(-1)) : null;
}

let serverOwnedPid = null;
async function ensureServer() {
  if (probeServer()) {
    console.log(`server: reusing existing ${BASE_URL} (not owned by this run)`);
    return;
  }
  await rm(path.join(root, ".vinext", "dev", "lock.json"), { force: true }).catch(() => {});
  const child = spawn("cmd", ["/c", `npm run dev -- --port ${PORT} > ${serverLog} 2>&1`], {
    cwd: root,
    detached: true,
    stdio: "ignore",
    windowsVerbatimArguments: true,
  });
  child.unref();
  for (let i = 0; i < 60; i += 1) {
    if (probeServer()) {
      serverOwnedPid = child.pid;
      console.log(`server: started on ${BASE_URL} (cmd pid ${serverOwnedPid ?? "?"})`);
      return;
    }
    await sleep(2000);
  }
  throw new Error(`dev server did not come up on ${BASE_URL}; see ${serverLog}`);
}

function stopServer() {
  if (!serverOwnedPid) return;
  // 按 spawn 记录的 cmd 树收口；端口占用者作兜底（npm→node 孙进程随树终止）。
  spawnSync("taskkill", ["/PID", String(serverOwnedPid), "/T", "/F"]);
  const listener = portOwnerPid();
  if (listener) spawnSync("taskkill", ["/PID", String(listener), "/T", "/F"]);
  console.log(`server: stopped (cmd tree ${serverOwnedPid})`);
  serverOwnedPid = null;
}

const suites = [
  { id: "fast", script: "test:fast", needsServer: false },
  { id: "knowledge", script: "check:knowledge", needsServer: false },
  { id: "full", script: "test:browser:full", needsServer: true },
  { id: "overall", script: "test:browser:overall", needsServer: true },
  { id: "mobile", script: "test:browser:mobile-preview", needsServer: true },
].filter((suite) => (!only || only.includes(suite.id)) && !skip.has(suite.id));

const manifest = {
  schemaVersion: 1,
  runId,
  commit,
  startedAt: new Date().toISOString(),
  completedAt: null,
  workers: workers ?? "config-default",
  mode: runAll ? "all" : "stop-on-fail",
  suites: [],
  verdict: "running",
};

let failed = false;
try {
  if (suites.some((suite) => suite.needsServer)) await ensureServer();
  for (const suite of suites) {
    process.stdout.write(`▶ ${suite.id} ... `, () => {});
    const outcome = await npmRun(suite);
    const { counts } = outcome;
    const red = outcome.exitCode !== 0 || outcome.timedOut || (counts.failed ?? 0) > 0 || (counts.nodeFail ?? 0) > 0;
    const summary = [
      counts.passed !== null && `${counts.passed} passed`,
      counts.skipped !== null && `${counts.skipped} skipped`,
      counts.failed !== null && `${counts.failed} failed`,
      counts.nodePass !== null && `node ${counts.nodePass} pass / ${counts.nodeFail ?? "?"} fail`,
      outcome.timedOut && "TIMEOUT",
    ].filter(Boolean).join(", ");
    console.log(`${red ? "FAIL" : "PASS"} (${(outcome.durationMs / 1000).toFixed(1)}s; ${summary || `exit ${outcome.exitCode}`})`);
    manifest.suites.push({ id: suite.id, command: `npm run ${suite.script}${suite.needsServer && workers ? ` -- --workers=${workers}` : ""}`, ...outcome });
    if (red) {
      failed = true;
      if (!runAll) break;
    }
  }
} catch (error) {
  console.error(`runner error: ${error?.message ?? error}`);
  failed = true;
} finally {
  stopServer();
}

manifest.completedAt = new Date().toISOString();
manifest.verdict = failed ? "failed" : "passed";
const manifestPath = path.join(runDir, "manifest.json");
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await writeFile(path.join(root, "artifacts", "quality", "regression", "latest.json"), `${JSON.stringify({ runId, commit, verdict: manifest.verdict, manifestPath: path.relative(root, manifestPath).replaceAll("\\", "/") }, null, 2)}\n`, "utf8");
console.log(`verdict=${manifest.verdict} run=${runId} commit=${commit.slice(0, 12)} manifest=${path.relative(root, manifestPath).replaceAll("\\", "/")}`);
process.exitCode = failed ? 1 : 0;
