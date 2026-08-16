import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/workflow-state-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { resolveDynamicQueueAdvance } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("a completed swelling target hands off to the muscle target that shifted into its place", () => {
  assert.equal(resolveDynamicQueueAdvance(0, ["target:chief:knee-muscle"], {
    completedKey: "target:swelling:knee-swelling",
    nextKey: "",
  }), 0);
});

test("an explicit next treatment is found by identity after the queue reorders", () => {
  assert.equal(resolveDynamicQueueAdvance(0, ["target:motion:knee-control", "target:chief:knee-muscle"], {
    completedKey: "target:swelling:knee-swelling",
    nextKey: "target:chief:knee-muscle",
  }), 1);
});

test("a stable target id survives removal of its previously first candidate", () => {
  assert.equal(resolveDynamicQueueAdvance(0, [
    "target:motion:knee-extension:joint-mobilization",
    "target:chief:other-muscle",
  ], {
    completedKey: "target:chief:first-muscle",
    nextKey: "target:motion:knee-extension:first-muscle",
    nextTargetId: "target:motion:knee-extension",
  }), 0);
});

test("a newly opened treatment for the same problem runs before the old next problem", () => {
  assert.equal(resolveDynamicQueueAdvance(1, [
    "target:chief:second-muscle",
    "target:motion:knee-extension:joint",
  ], {
    completedKey: "target:chief:first-muscle",
    nextKey: "target:motion:knee-extension:joint",
    completedTargetId: "target:chief",
  }), 0);
});

test("reusing a result without a new record exits a still-present final target", () => {
  assert.equal(resolveDynamicQueueAdvance(0, ["target:motion:knee-muscle"], {
    completedKey: "target:motion:knee-muscle",
    nextKey: "",
  }), 1);
});

test("an empty recalculated queue resolves to its completed position", () => {
  assert.equal(resolveDynamicQueueAdvance(1, [], {
    completedKey: "target:chief:knee-muscle",
    nextKey: "",
  }), 0);
});
