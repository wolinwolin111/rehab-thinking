import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/safety/special-test-trigger-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

const intake = {
  description: "走路崴了右脚",
  location: "外踝",
  sensoryLocation: "",
  symptomType: "刺痛",
  mechanism: "扭转或崴伤",
  provocationTypes: ["走路"],
  forceDirection: "",
};

test("an empty trigger is never relevant", () => {
  assert.equal(core.specialIsRelevant(undefined, intake), false);
});

test("a nerve-symptom trigger matches a matching symptom source", () => {
  assert.equal(core.specialIsRelevant("麻电放射相关", { ...intake, symptomType: "麻或电感" }), true);
});

test("an acute-trauma trigger is relevant when the mechanism is traumatic", () => {
  assert.equal(core.specialIsRelevant("急性外伤骨点压痛", intake), true);
  assert.equal(core.specialIsRelevant("急性外伤骨点压痛", { ...intake, mechanism: "没有明确受伤" }), false);
});

test("a plantar trigger is suppressed when the user never described the foot", () => {
  const plantarTrigger = "足底或足跟痛与晨起、走路、提踵相关";
  assert.equal(core.specialIsRelevant(plantarTrigger, intake), false);
  assert.equal(core.specialIsRelevant(plantarTrigger, { ...intake, location: "足底", description: "足底走路疼" }), true);
});

test("an exact trigger substring in the source is relevant", () => {
  assert.equal(core.specialIsRelevant("下楼", { ...intake, provocationTypes: ["下楼"] }), true);
});
