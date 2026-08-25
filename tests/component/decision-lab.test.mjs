import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("decision lab exposes the ten clinical audit cases", async () => {
  const source = await readFile(new URL("../../src/features/rehabmind/decision-lab/knee-decision-lab.tsx", import.meta.url), "utf8");
  assert.match(source, /膝关节决策对照页/);
  assert.match(source, /案例 01 · 主诉优先/);
  assert.match(source, /案例 05 · 关节松动门槛/);
  assert.match(source, /案例 10 · 最后统一复测/);
  assert.match(source, /一组相关肌肉处理后/);
  assert.match(source, /是否漏掉处理 · 是否重复处理 · 是否重复复测/);
});

test("decision lab exposes the twelve thigh and calf audit cases", async () => {
  const page = await readFile(new URL("../../app/decision-lab/page.tsx", import.meta.url), "utf8");
  const source = await readFile(new URL("../../src/features/rehabmind/decision-lab/local-limb-decision-lab.tsx", import.meta.url), "utf8");
  assert.match(page, /大腿 \/ 小腿/);
  assert.match(page, /LocalLimbDecisionLab/);
  assert.match(source, /LOCAL_LIMB_LAB_CASES/);
  assert.match(source, /本次首轮检查|快速复查/);
  assert.match(source, /今天怎么处理/);
  assert.match(source, /当场统一复测/);
  assert.match(source, /decision\.trainingIds/);
});
