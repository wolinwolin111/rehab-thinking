import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/candidate-safety-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

const selfMuscle = { type: "muscle", access: "self", title: "小腿后侧轻柔松解", do: "轻柔松解肌腹30秒", observe: "", tags: [] };
const joint = { type: "joint", access: "therapist", title: "膝关节屈曲方向松动", do: "由专业人员完成低刺激关节松动", observe: "", tags: [] };
const neural = { type: "neural", access: "therapist", title: "神经滑动", do: "温和神经滑动", observe: "", tags: [] };
const pressure = { type: "muscle", access: "self", title: "深压放松", do: "重压激痛点", observe: "深压", tags: [] };

test("availability gates by role", () => {
  assert.equal(core.candidateIsAvailable(selfMuscle, "rehab"), true);
  assert.equal(core.candidateIsAvailable(selfMuscle, "coach"), true);
  assert.equal(core.candidateIsAvailable(selfMuscle, "general"), true);
  assert.equal(core.candidateIsAvailable(joint, "rehab"), true);
  assert.equal(core.candidateIsAvailable(joint, "coach"), false);
  assert.equal(core.candidateIsAvailable(joint, "general"), false);
  assert.equal(core.candidateIsAvailable(neural, "general"), false);
});

test("pressure detection finds deep-press candidates", () => {
  assert.equal(core.candidateUsesPressure(pressure), true);
  assert.equal(core.candidateUsesPressure(selfMuscle), false);
});

test("sharp-pain path blocks joint and pressure candidates", () => {
  assert.equal(core.candidateAllowedInSharpPath(selfMuscle, true), true);
  assert.equal(core.candidateAllowedInSharpPath(joint, true), false);
  assert.equal(core.candidateAllowedInSharpPath(pressure, true), false);
  assert.equal(core.candidateAllowedInSharpPath(joint, false), true);
});
