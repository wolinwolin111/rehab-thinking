// AUDIT-02 核心：阶段推进 → 关键事件字典映射。
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/stage-event-core.ts", import.meta.url), "utf8");
const out = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(out).toString("base64")}`);

test("completing a stage maps to its dictionary event", () => {
  // 六阶段：0 症状信息 1 关键确认 2 评估检查 3 处理复测 4 训练居家 5 康复总结
  assert.equal(core.stageCompletionEvent(0), "intake_saved");
  assert.equal(core.stageCompletionEvent(1), "intake_confirmed");
  assert.equal(core.stageCompletionEvent(2), "assessment_completed");
  assert.equal(core.stageCompletionEvent(3), "session_saved");
  assert.equal(core.stageCompletionEvent(4), "training_plan_saved");
});

test("summary stage and unknown stages produce no extra event", () => {
  assert.equal(core.stageCompletionEvent(5), null);
  assert.equal(core.stageCompletionEvent(-1), null);
  assert.equal(core.stageCompletionEvent(99), null);
});

test("progression helper emits each event once per lifecycle advance", () => {
  const seen = [];
  let prev = -1;
  for (const next of [0, 1, 2, 3, 4, 4, 5]) {
    const event = core.pickStageAdvanceEvent({ prev, next, seen });
    if (event) seen.push(event);
    prev = next;
  }
  assert.deepEqual(seen, ["intake_saved", "intake_confirmed", "assessment_completed", "session_saved", "training_plan_saved"]);
});

test("revisiting an earlier stage does not re-emit", () => {
  const seen = ["intake_saved", "intake_confirmed"];
  assert.equal(core.pickStageAdvanceEvent({ prev: 1, next: 0, seen }), null);
  assert.equal(core.pickStageAdvanceEvent({ prev: 0, next: 1, seen }), null); // 已发过
});
