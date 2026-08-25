import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/tissue-pathway-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { buildTissuePathway } = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

const base = { regionId: "calf-local", location: "小腿后侧", onset: "1～6周", mechanism: "逐渐出现", symptomType: "酸痛", symptoms: [], provocationTypes: ["运动过程中"], description: "" };

test("direct muscle impact uses a contusion path without default ice or massage", () => {
  const decision = buildTissuePathway({ ...base, regionId: "thigh-local", location: "大腿前侧", onset: "今天或昨天", mechanism: "跌倒或碰撞", symptoms: ["肿胀或淤青", "按压痛"] });
  assert.equal(decision.id, "muscle-contusion");
  assert.ok(decision.blockedActions.some((item) => item.includes("不按摩")));
  assert.ok(decision.blockedActions.some((item) => item.includes("冰敷不作为默认")));
});

test("gradual focal load-related bone pain does not enter muscle release", () => {
  const decision = buildTissuePathway({ ...base, location: "胫骨内侧一个固定点", provocationTypes: ["走路、站立或负重", "运动过程中"], description: "跑量增加后局限骨点疼，走路也疼" });
  assert.equal(decision.id, "bone-stress-suspected");
  assert.ok(decision.blockedActions.some((item) => item.includes("不进入普通肌肉松解")));
  assert.deepEqual(decision.trainingStages.slice(-2), ["走跑交替", "先增加距离，再增加速度"]);
});

test("tendon path is driven by progressive loading and next-day response", () => {
  const decision = buildTissuePathway({ ...base, location: "跟腱中段", description: "跑步和提踵时跟腱疼" });
  assert.equal(decision.id, "tendon-load");
  assert.equal(decision.retestTiming, "next-day");
  assert.ok(decision.trainingStages.includes("双侧慢速力量"));
  assert.ok(decision.blockedActions.some((item) => item.includes("不以反复松解")));
});

test("a knee landmark named patellar tendon does not by itself force tendon-load", () => {
  const decision = buildTissuePathway({
    regionId: "knee",
    location: "髌骨下方 / 髌腱",
    onset: "1～6周",
    mechanism: "逐渐出现",
    symptomType: "疼痛",
    symptoms: [],
    provocationTypes: ["下蹲或起身"],
    description: "膝盖下缘下蹲时疼痛",
  });
  assert.equal(decision.id, "standard");
});

test("explicit knee tendon wording still uses the tendon-load safeguards", () => {
  const decision = buildTissuePathway({
    regionId: "knee",
    location: "髌骨下方 / 髌腱",
    onset: "1～6周",
    mechanism: "逐渐出现",
    symptomType: "髌腱疼痛",
    symptoms: [],
    provocationTypes: ["下蹲或起身"],
    description: "明确是髌腱负荷后疼痛",
  });
  assert.equal(decision.id, "tendon-load");
});
