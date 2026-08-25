// 全链路有状态随机探索（TEST-03 方向）：
// 种子化动作流驱动「状态翻转 → 处理记录复测门 → 队列推进/重算 → 训练门禁 → 导航」完整编排面，
// 每步断言两级不变量、命令合法性与阶段不越权；失败时收缩为最小可复现动作序列。
// 探索内核在 tests/support/orchestrator-exploration-core.mjs，供变异诊断脚本复用。
import test from "node:test";
import { loadTypeScriptModule } from "../support/load-typescript-module.mjs";
import { generatePlan, replay, rng, shrink } from "../support/orchestrator-exploration-core.mjs";

const workflow = await loadTypeScriptModule(
  "./src/features/rehabmind/workflow/workflow-orchestrator.ts",
);
const invariants = await loadTypeScriptModule(
  "./src/features/rehabmind/workflow/workflow-invariants.ts",
);

test("全链路序列探索：200 个种子的编排动作流保持阶段与不变量成立", () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const ops = generatePlan(rng(seed));
    try {
      replay(workflow, invariants, ops);
    } catch (error) {
      const minimal = shrink(workflow, invariants, ops);
      throw new Error(`seed=${seed} 最小复现序列=${JSON.stringify(minimal)}；原始错误：${error.message}`);
    }
  }
});
