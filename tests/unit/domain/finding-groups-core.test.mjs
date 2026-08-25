import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/shared/finding-groups-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("groups findings into the five fixed categories in order", () => {
  const groups = core.buildFindingGroups([
    { id: "motion:knee-extension", title: "膝伸直受限" },
    { id: "tension:shared:pilot-muscle-tension", title: "大腿前侧肌张力增高" },
    { id: "strength:knee-quadriceps", title: "股四头肌发力偏弱" },
    { id: "symptom:motion:ankle-dorsiflexion", title: "勾脚活动不适" },
    { id: "track:swelling", title: "肿胀", priority: "track" },
  ]);
  assert.deepEqual(groups.map((g) => g.key), ["mobility", "tension", "control", "symptom", "tracking"]);
  assert.equal(groups[0].label, "活动受限");
  assert.equal(groups[0].items[0].id, "motion:knee-extension");
  assert.equal(groups[4].items[0].id, "track:swelling");
});

test("drops empty groups and returns an empty array for no input", () => {
  const groups = core.buildFindingGroups([{ id: "motion:ankle-plantarflexion", title: "跖屈受限" }]);
  assert.deepEqual(groups.map((g) => g.key), ["mobility"]);
  assert.deepEqual(core.buildFindingGroups([]), []);
});

test("control-title and instability clues classify into control", () => {
  assert.equal(core.findingGroupKey({ id: "function:ankle-single-leg", title: "动作控制需要改善" }), "control");
  assert.equal(core.findingGroupKey({ id: "function:knee-step", title: "单腿站立不稳定" }), "control");
});
