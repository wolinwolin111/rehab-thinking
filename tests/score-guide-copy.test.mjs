import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/score-guide-copy.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("score guide uses the approved dynamic sensation bands", () => {
  assert.equal(core.scoreGuideLabel(0), "没有疼痛或不适");
  assert.equal(core.scoreGuideLabel(1), "刚有一点感觉");
  assert.equal(core.scoreGuideLabel(2), "刚有一点感觉");
  assert.equal(core.scoreGuideLabel(3), "轻微痛感");
  assert.equal(core.scoreGuideLabel(4), "轻微痛感");
  assert.equal(core.scoreGuideLabel(5), "明显难受");
  assert.equal(core.scoreGuideLabel(6), "明显难受");
  assert.equal(core.scoreGuideLabel(7), "很痛");
  assert.equal(core.scoreGuideLabel(8), "很痛");
  assert.equal(core.scoreGuideLabel(9), "接近最严重");
  assert.equal(core.scoreGuideLabel(10), "能想象到的最严重");
});

test("score guide clamps unexpected values without changing the score contract", () => {
  assert.equal(core.scoreGuideLabel(-1), "没有疼痛或不适");
  assert.equal(core.scoreGuideLabel(10.6), "能想象到的最严重");
});
