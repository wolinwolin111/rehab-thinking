import { spawnSync } from "node:child_process";

const npmCommand = "npm";
const result = spawnSync(npmCommand, ["audit", "--omit=dev", "--json"], {
  encoding: "utf8",
  shell: process.platform === "win32",
  maxBuffer: 16 * 1024 * 1024,
});
if (result.error) {
  console.error(`dependency audit could not start: ${result.error.message}`);
  process.exit(2);
}
let report;
try {
  report = JSON.parse(result.stdout || "{}");
} catch {
  console.error("dependency audit did not return JSON");
  process.exit(2);
}
if (report.error) {
  console.error(`dependency audit unavailable: ${report.error.summary ?? report.error.code ?? "unknown error"}`);
  process.exit(2);
}
if (report.auditReportVersion !== 2 || !report.metadata?.vulnerabilities) {
  console.error("dependency audit returned an incomplete report");
  process.exit(2);
}
const vulnerabilities = report.metadata?.vulnerabilities ?? {};
const summary = {
  productionDependencies: report.metadata?.dependencies?.prod ?? null,
  critical: vulnerabilities.critical ?? 0,
  high: vulnerabilities.high ?? 0,
  moderate: vulnerabilities.moderate ?? 0,
  low: vulnerabilities.low ?? 0,
};
console.log(JSON.stringify(summary));
if (summary.critical > 0 || summary.high > 0) process.exitCode = 1;
