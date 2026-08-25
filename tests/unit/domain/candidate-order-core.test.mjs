import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/treatment/candidate-order-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("directionChain maps knee flexion to the flexion chain", () => {
  assert.equal(core.directionChain("knee-flexion"), "膝屈曲链");
  assert.equal(core.directionChain("ankle-dorsiflexion"), "矢状面·前侧链");
  assert.equal(core.directionChain("unknown"), "其他相关问题");
});

test("candidateDirectionChain returns functional-action when any retest is functional", () => {
  assert.equal(core.candidateDirectionChain({ type: "muscle", retestIds: ["ankle-squat", "ankle-dorsiflexion"] }), "功能动作");
  assert.equal(core.candidateDirectionChain({ type: "muscle", retestIds: ["knee-flexion"] }), "膝屈曲链");
});

test("orderCandidatesByChain sorts by chain then type", () => {
  const ordered = core.orderCandidatesByChain([
    { type: "joint", retestIds: ["knee-flexion"] },
    { type: "muscle", retestIds: ["knee-flexion"] },
    { type: "muscle", retestIds: ["ankle-dorsiflexion"] },
  ]);
  assert.deepEqual(ordered.map((c) => `${c.type}:${c.retestIds[0]}`), ["muscle:ankle-dorsiflexion", "muscle:knee-flexion", "joint:knee-flexion"]);
});

test("pilot treatment alias matching is symmetric via alias map", () => {
  assert.equal(core.pilotTreatmentMatchesCandidate("knee-flexion-local-muscle", "knee-mobility-posterior"), true);
  assert.equal(core.pilotTreatmentMatchesCandidate("knee-flexion-local-muscle", "unrelated"), false);
  assert.equal(core.pilotTreatmentMatchesCandidate("same", "same"), true);
});
