import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/function-assessment-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("completion falls back to the simple field", () => {
  assert.equal(core.functionCompletionValue({ simple: "unable" }), "unable");
  assert.equal(core.functionCompletionValue({ simple: "skip" }), "skip");
  assert.equal(core.functionCompletionValue({ simple: "painful" }), "complete");
  assert.equal(core.functionCompletionValue({ simple: "weak" }), undefined);
});

test("completion prefers the explicit field over the derived one", () => {
  assert.equal(core.functionCompletionValue({ functionCompletion: "complete", simple: "unable" }), "complete");
});

test("control derives compensated from present and stable from normal", () => {
  assert.equal(core.functionControlValue({ simple: "present" }), "compensated");
  assert.equal(core.functionControlValue({ simple: "normal" }), "stable");
  assert.equal(core.functionControlValue({ functionCompletion: "complete" }), undefined);
});

test("discomfort maps unable-pain to yes and unable-weak to no", () => {
  assert.equal(core.functionDiscomfortValue({ functionCompletion: "unable", functionUnableReason: "pain" }), "yes");
  assert.equal(core.functionDiscomfortValue({ functionCompletion: "unable", functionUnableReason: "weak" }), "no");
  assert.equal(core.functionDiscomfortValue({ functionCompletion: "unable" }), undefined);
});
