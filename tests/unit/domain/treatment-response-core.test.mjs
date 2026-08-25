import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/treatment-response-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("a 5 to 2 response is partial contribution rather than final success", () => {
  assert.equal(core.classifyTreatmentResponse({ beforeScore: 5, afterScore: 2, result: "better", chiefRetested: true }), "partial-contribution");
});

test("a later 2 to 0 response is a key completion, not a smaller effect", () => {
  assert.equal(core.classifyTreatmentResponse({ beforeScore: 2, afterScore: 0, result: "better", chiefRetested: true, priorImprovingTreatmentCount: 1 }), "key-completion");
  assert.ok(core.treatmentResponsePriority("key-completion") > core.treatmentResponsePriority("partial-contribution"));
});

test("a single treatment that reaches zero is independently completed", () => {
  assert.equal(core.classifyTreatmentResponse({ beforeScore: 5, afterScore: 0, result: "better", chiefRetested: true, priorImprovingTreatmentCount: 0 }), "independent-completion");
});

test("the resolved combination keeps partial contributors and the completion item in order", () => {
  const combination = core.resolvedTreatmentCombination([
    { candidateId: "a", responseRole: "partial-contribution" },
    { candidateId: "b", responseRole: "key-completion" },
    { candidateId: "c", responseRole: "no-change" },
  ]);
  assert.deepEqual(combination.map((item) => item.candidateId), ["a", "b"]);
});
