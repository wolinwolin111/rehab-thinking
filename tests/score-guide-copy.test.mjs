import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/score-guide-copy.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("score guide uses one distinct sensation description for every score", () => {
  const labels = [
    "没有疼痛或不适",
    "几乎没有感觉",
    "很轻微",
    "轻微不适",
    "有些明显",
    "中等程度",
    "比较明显",
    "明显难受",
    "很痛",
    "接近最严重",
    "能想象到的最严重",
  ];
  assert.deepEqual(labels.map((_, score) => core.scoreGuideLabel(score)), labels);
  assert.equal(new Set(labels).size, 11);
});

test("score guide clamps unexpected values without changing the score contract", () => {
  assert.equal(core.scoreGuideLabel(-1), "没有疼痛或不适");
  assert.equal(core.scoreGuideLabel(10.6), "能想象到的最严重");
});
