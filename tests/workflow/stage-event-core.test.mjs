// AUDIT-02 核心：阶段推进 → 关键事件字典映射。
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../src/features/rehabmind/workflow/stage-events.ts", import.meta.url), "utf8");
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
  let prev = 0;
  for (const next of [1, 2, 3, 4, 4, 5]) {
    const event = core.pickStageAdvanceEvent({ prev, next, seen });
    if (event) seen.push(event);
    prev = next;
  }
  assert.deepEqual(seen, ["intake_saved", "intake_confirmed", "assessment_completed", "session_saved", "training_plan_saved"]);
});

test("AUDIT-03: entering the next stage records completion of the stage being left", () => {
  assert.equal(core.pickStageAdvanceEvent({ prev: 0, next: 1, seen: [] }), "intake_saved");
  assert.equal(core.pickStageAdvanceEvent({ prev: 1, next: 2, seen: [] }), "intake_confirmed");
  assert.equal(core.pickStageAdvanceEvent({ prev: 4, next: 5, seen: [] }), "training_plan_saved");
});

test("revisiting an earlier stage does not re-emit", () => {
  const seen = ["intake_saved", "intake_confirmed"];
  assert.equal(core.pickStageAdvanceEvent({ prev: 1, next: 0, seen }), null);
  assert.equal(core.pickStageAdvanceEvent({ prev: 0, next: 1, seen }), null); // 已发过
});

test("AUDIT-04: dedupe state is unique and retry IDs include the semantic event type", () => {
  const seen = [];
  core.markStageEventSeen(seen, "intake_saved");
  core.markStageEventSeen(seen, "intake_saved");
  assert.deepEqual(seen, ["intake_saved"]);
  assert.notEqual(
    core.pilotProgressEventId("case-1", "intake_saved", "abc"),
    core.pilotProgressEventId("case-1", "session_saved", "abc"),
  );
  assert.equal(
    core.pilotProgressEventId("case-1", "intake_saved", "abc"),
    core.pilotProgressEventId("case-1", "intake_saved", "abc"),
  );
});
