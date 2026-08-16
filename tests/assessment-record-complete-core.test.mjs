import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

/**
 * 多文件 core 打包加载：transpile 每个文件，把依赖文件的 export 转成局部声明、
 * 去掉入口文件的相对 import，再拼成一个 data URL 模块。这样带 import 的纯核心
 * 也能复用单文件转译的测试方式。
 */
async function loadBundle(paths) {
  const parts = [];
  for (let i = 0; i < paths.length; i++) {
    const src = await readFile(new URL(paths[i], import.meta.url), "utf8");
    let out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    if (i < paths.length - 1) {
      out = out.replace(/export\s+/g, "");
    } else {
      out = out.replace(/import\s*\{[^}]*\}\s*from\s*"[^"]*";?/g, "");
    }
    parts.push(out);
  }
  return import(`data:text/javascript;base64,${Buffer.from(parts.join("\n")).toString("base64")}`);
}

const corePromise = loadBundle([
  "../app/assessment-answer-core.ts",
  "../app/function-assessment-core.ts",
  "../app/motion-assessment-core.ts",
  "../app/assessment-record-complete-core.ts",
]);

test("a function check completes when completion, control and discomfort are present", async () => {
  const core = await corePromise;
  assert.equal(core.assessmentRecordComplete(
    { kind: "function" },
    { functionCompletion: "complete", functionControl: "stable", functionDiscomfort: "no" },
    false,
  ), true);
  assert.equal(core.assessmentRecordComplete(
    { kind: "function" },
    { functionCompletion: "complete", functionControl: "stable" },
    false,
  ), false);
});

test("a strength check needs an unable reason when unable", async () => {
  const core = await corePromise;
  assert.equal(core.assessmentRecordComplete({ kind: "strength" }, { simple: "weak" }, false), true);
  assert.equal(core.assessmentRecordComplete({ kind: "strength" }, { simple: "unable" }, false), false);
  // unable + pain 归类为「发力痛」，需要位置/性质/评分才算完整
  assert.equal(core.assessmentRecordComplete({ kind: "strength" }, { simple: "unable", strengthUnableReason: "pain" }, false), false);
  assert.equal(core.assessmentRecordComplete({ kind: "strength" }, { simple: "unable", strengthUnableReason: "weak" }, false), true);
});

test("a passive-only motion needs capability and passive completeness", async () => {
  const core = await corePromise;
  assert.equal(core.assessmentRecordComplete({ kind: "motion", testMode: "passive" }, { passive: "limited", passiveDiscomfort: "no" }, true), true);
  assert.equal(core.assessmentRecordComplete({ kind: "motion", testMode: "passive" }, { passive: "limited", passiveDiscomfort: "no" }, false), false);
});

test("an active motion that is symptomatic completes only with location, type and score", async () => {
  const core = await corePromise;
  assert.equal(core.assessmentRecordComplete(
    { kind: "motion" },
    { active: "limited", discomfort: "yes", discomfortLocation: "膝前", discomfortType: "刺痛", symptomScore: 5 },
    false,
  ), true);
  assert.equal(core.assessmentRecordComplete({ kind: "motion" }, { active: "limited", discomfort: "yes" }, false), false);
});

test("a missing record is never complete", async () => {
  const core = await corePromise;
  assert.equal(core.assessmentRecordComplete({ kind: "motion" }, undefined, false), false);
});
