// D 组特殊检查触发核心单元合同（D-1 触发条件 / D-3 非对应场景不出现）。
// 交接文档第四部分不变式 6 的逻辑层 oracle：骨折筛查等专项检查必须由明确的
// 外伤机制触发，非对应场景不得出现。
import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const { specialIsRelevant } = await loadTypeScriptModule("./src/domain/rehab/safety/special-test-trigger-core.ts");

const baseIntake = {
  description: "右膝内侧疼",
  location: "膝内侧关节线",
  sensoryLocation: "",
  symptomType: "酸痛",
  mechanism: "逐渐出现",
  provocationTypes: ["下楼"],
  forceDirection: "",
};

test("D-1: acute trauma mechanisms trigger the fracture-screen class", () => {
  const acute = { ...baseIntake, description: "右膝昨天扭伤肿了", mechanism: "扭伤" };
  assert.equal(specialIsRelevant("急性外伤后骨折风险筛查（右膝）", acute), true);
  assert.equal(specialIsRelevant("扭转后不稳筛查", { ...acute, description: "扭转时听到响声" }), true);
});

test("D-1: non-trauma mechanisms must not trigger the fracture-screen class", () => {
  assert.equal(specialIsRelevant("急性外伤后骨折风险筛查（右膝）", baseIntake), false);
  assert.equal(specialIsRelevant("急性外伤后骨折风险筛查（右膝）", { ...baseIntake, mechanism: "没有明确受伤" }), false);
});

test("D-3: instability words trigger stability screens only with explicit symptoms", () => {
  assert.equal(
    specialIsRelevant("打软腿后向不稳筛查", { ...baseIntake, description: "走路时打软腿" }),
    true,
  );
  assert.equal(specialIsRelevant("打软腿后向不稳筛查", baseIntake), false);
});

test("triggers never fire from derived words alone for plantar surfaces", () => {
  // 无足底主诉来源：即使触发词含足底也不出现（防派生词带出）
  assert.equal(specialIsRelevant("足底筋膜紧张", baseIntake), false);
  // 用户明确描述足底来源后，触发词片段命中才成立
  assert.equal(
    specialIsRelevant("足底筋膜紧张", { ...baseIntake, description: "脚踩地时足底筋膜紧张疼" }),
    true,
  );
});
