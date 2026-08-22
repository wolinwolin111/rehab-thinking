import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const registryPath = process.env.QUALITY_SCENARIO_REGISTRY ?? "tests/scenario-registry.json";
const resultPath = process.env.QUALITY_PLAYWRIGHT_RESULTS ?? "artifacts/quality/playwright/results.json";

const registry = JSON.parse(await readFile(registryPath, "utf8"));
async function findResultPaths() {
  if (process.env.QUALITY_PLAYWRIGHT_RESULTS) return [resultPath];
  const root = path.dirname(resultPath);
  const paths = [];
  try {
    paths.push(resultPath);
    for (const entry of await readdir(root, { withFileTypes: true })) {
      if (entry.isDirectory()) paths.push(path.join(root, entry.name, "results.json"));
    }
  } catch {
    return [];
  }
  return paths;
}

const results = [];
for (const filePath of await findResultPaths()) {
  try {
    results.push({ path: filePath, data: JSON.parse(await readFile(filePath, "utf8")) });
  } catch {
    // A layer may not have run yet or may have no report.
  }
}

function flattenSuites(suites, output = []) {
  for (const suite of suites ?? []) {
    for (const spec of suite.specs ?? []) {
      output.push({
        title: [suite.title, spec.title].filter(Boolean).join(" "),
        tests: spec.tests ?? [],
      });
    }
    flattenSuites(suite.suites, output);
  }
  return output;
}

const specs = results.flatMap((item) => flattenSuites(item.data?.suites ?? []).map((spec) => ({ ...spec, evidence: item.path })));
const matched = registry.map((entry) => {
  const matchingSpecs = specs.filter((item) => item.title.includes(entry.titlePattern));
  const outcomes = matchingSpecs.flatMap((spec) => spec.tests?.flatMap((test) => test.results ?? []).map((item) => item.status) ?? []);
  const evidence = [...new Set(matchingSpecs.map((item) => item.evidence))];
  return {
    scenarioId: entry.scenarioId,
    priority: entry.priority,
    evidenceType: entry.evidenceType,
    status: outcomes.length === 0 ? "not_run" : outcomes.some((status) => ["failed", "timedOut", "interrupted"].includes(status)) ? "failed" : outcomes.includes("passed") ? "passed" : "not_run",
    evidence,
  };
});

const missingScripts = registry.filter((entry) => !entry.script);
if (missingScripts.length) throw new Error(`场景登记缺少脚本：${missingScripts.map((entry) => entry.scenarioId).join(", ")}`);

const summary = {
  generatedAt: new Date().toISOString(),
  registryCount: registry.length,
  resultFiles: results.map((item) => item.path),
  scenarios: matched,
  counts: {
    passed: matched.filter((item) => item.status === "passed").length,
    failed: matched.filter((item) => item.status === "failed").length,
    notRun: matched.filter((item) => item.status === "not_run").length,
  },
};

const summaryPath = process.env.QUALITY_SUMMARY_PATH ?? "artifacts/quality/summary.json";
await mkdir(path.dirname(summaryPath), { recursive: true });
await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
if (matched.some((item) => item.status === "failed")) process.exitCode = 1;
