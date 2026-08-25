import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/motion-assessment-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("active motion needs a discomfort answer and location/score when symptomatic", () => {
  assert.equal(core.activeMotionRecordComplete({ active: "limited", discomfort: "no" }), true);
  assert.equal(core.activeMotionRecordComplete({ active: "limited" }), false);
  assert.equal(core.activeMotionRecordComplete({ active: "limited", discomfort: "yes" }), false);
  assert.equal(core.activeMotionRecordComplete({ active: "limited", discomfort: "yes", discomfortLocation: "膝前", discomfortType: "刺痛", symptomScore: 5 }), true);
});

test("active unable-pain requires a reason; other unable reasons complete without discomfort", () => {
  assert.equal(core.activeMotionRecordComplete({ active: "unable" }), false);
  assert.equal(core.activeMotionRecordComplete({ active: "unable", unableReason: "fear" }), true);
});

test("passive needs a discomfort answer and score when symptomatic", () => {
  assert.equal(core.passiveMotionRecordComplete({ passive: "limited", passiveDiscomfort: "no" }), true);
  assert.equal(core.passiveMotionRecordComplete({ passive: "skip" }), true);
  assert.equal(core.passiveMotionRecordComplete({ passive: "limited", passiveDiscomfort: "yes" }), false);
  assert.equal(core.passiveMotionRecordComplete({ passive: "limited", passiveDiscomfort: "yes", passiveDiscomfortLocation: "膝后", passiveDiscomfortType: "牵扯", passiveSymptomScore: 3 }), true);
});

test("passive requires end feel only when requested", () => {
  assert.equal(core.passiveMotionRecordComplete({ passive: "limited", passiveDiscomfort: "no" }, true), false);
  assert.equal(core.passiveMotionRecordComplete({ passive: "limited", passiveDiscomfort: "no", passiveEndFeel: "firm" }, true), true);
});

test("motionNeedsPassive gates on capability and abnormal active", () => {
  assert.equal(core.motionNeedsPassive({ testMode: "passive" }, {}, true), true);
  assert.equal(core.motionNeedsPassive({ testMode: "active" }, {}, false), false);
  assert.equal(core.motionNeedsPassive({ testMode: "active" }, { active: "limited" }, true), true);
  assert.equal(core.motionNeedsPassive({ testMode: "active" }, { active: "same", discomfort: "no" }, true), false);
});
