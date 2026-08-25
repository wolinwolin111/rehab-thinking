import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const requiredScenarios = [
  "单侧膝关节动作疼痛",
  "单侧踝扭伤",
  "双侧问题与优先侧",
  "明显肿胀",
  "麻木或力量变化",
  "高不适停止",
  "动作无法完成",
  "后续康复后改善",
  "后续康复后无变化",
  "后续康复后加重",
  "训练后加重",
  "第二次康复",
  "出现新问题",
  "返回修改旧答案",
];

test("TEST-WORKBENCH-02: the scenario catalog keeps all approved starting points and evidence classes", async () => {
  const source = await readFile(new URL("../../src/features/rehabmind/test-workbench/scenario-catalog.ts", import.meta.url), "utf8");
  for (const title of requiredScenarios) assert.match(source, new RegExp(`title: \\"${title}\\"`), title);
  assert.match(source, /mode: "full_flow"/);
  assert.match(source, /mode: "page_boundary"/);
  assert.match(source, /assessmentResults: isFullFlow \? \{\} : KNEE_PAGE_ASSESSMENTS/);
});

test("TEST-WORKBENCH-03: the shell uses isolated storage and production workbench context", async () => {
  const shell = await readFile(new URL("../../src/features/rehabmind/test-workbench/pilot-test-workbench.tsx", import.meta.url), "utf8");
  const workbench = await readFile(new URL("../../src/features/rehabmind/components/workbench/rehabmind-workbench.tsx", import.meta.url), "utf8");
  assert.match(shell, /saveLocalDraft\(draft, "test"\)/);
  assert.match(shell, /testRunId:/);
  assert.match(shell, /scenarioId:/);
  assert.match(shell, /<RehabMindCompleteDemo key=\{active\.instance\} testContext=\{active\.context\}/);
  assert.match(workbench, /const storageScope = testContext \? "test" : "user"/);
  assert.match(workbench, /testRunId: testContext\?\.testRunId/);
});
