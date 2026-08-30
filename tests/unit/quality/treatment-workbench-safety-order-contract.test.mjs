import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

test("treatment workbench render follows safety early returns (d558c08 order contract)", () => {
  const src = fs.readFileSync(
    path.join(root, "src", "features", "rehabmind", "components", "stages", "treatment-retest-stage.tsx"),
    "utf8",
  );
  const worsened = src.indexOf("if (treatmentWorsened)");
  const bilateral = src.indexOf("if (bilateralNeedsReferral)");
  const workbench = src.indexOf("if (isThinkingMode && thinkingWorkbenchOpen) return renderTreatmentWorkbench()");
  // 护栏：工作台渲染早退必须位于安全早退（treatmentWorsened / bilateralNeedsReferral）之后。
  // 若开发把 workbench 早退插到安全分支前面，安全优先级会被破坏 → 加强场景会误渲染工作台。
  assert.ok(worsened >= 0, "treatmentWorsened 早退分支必须存在");
  assert.ok(bilateral >= 0, "bilateralNeedsReferral 早退分支必须存在");
  assert.ok(workbench >= 0, "工作台渲染早退必须存在");
  assert.ok(
    workbench > worsened && workbench > bilateral,
    "工作台渲染早退必须位于 treatmentWorsened 与 bilateralNeedsReferral 安全早退之后（安全页优先）",
  );
});
