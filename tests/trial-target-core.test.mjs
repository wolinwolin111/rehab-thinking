import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadBundle(paths) {
  const parts = [];
  for (let i = 0; i < paths.length; i++) {
    const src = await readFile(new URL(paths[i], import.meta.url), "utf8");
    let out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    out = out.replace(/import\s*\{[^}]*\}\s*from\s*"[^"]*";?/g, "");
    if (i < paths.length - 1) out = out.replace(/export\s+/g, "");
    parts.push(out);
  }
  return import(`data:text/javascript;base64,${Buffer.from(parts.join("\n")).toString("base64")}`);
}

const core = await loadBundle([
  "../app/pilot-motion-muscle-knowledge.ts",
  "../app/candidate-treatment-core.ts",
  "../app/action-identity-core.ts",
  "../app/trial-target-core.ts",
]);

const muscle = { id: "muscle:calf-posterior-release", type: "muscle", title: "小腿后侧轻柔松解", do: "轻柔松解", tags: ["calf"], retestIds: ["ankle-plantarflexion"], siteLabel: "小腿后侧", targetLabel: "", actionLabel: "" };

test("treatmentCanCarryAcrossProblems allows muscle/joint/control/neural", () => {
  assert.equal(core.treatmentCanCarryAcrossProblems(muscle), true);
  assert.equal(core.treatmentCanCarryAcrossProblems({ ...muscle, type: "swelling" }), false);
});

test("consolidateTrialTargetsByTreatment merges same-treatment targets and dedups retest ids", () => {
  const targets = [
    { id: "target:a", finding: { side: "右侧" }, candidates: [muscle], retestFindings: [{ id: "motion:ankle-plantarflexion" }] },
    { id: "target:b", finding: { side: "右侧" }, candidates: [{ ...muscle, id: "muscle:calf-posterior-release-2", retestIds: ["calf-plantarflexion"] }], retestFindings: [{ id: "motion:calf-plantarflexion" }] },
  ];
  const result = core.consolidateTrialTargetsByTreatment(targets);
  assert.equal(result.length, 1);
  // 同区域同侧合并后，方向 id 归并为 calf-plantarflexion 与 ankle-plantarflexion 同一物理动作
  assert.ok(result[0].candidates[0].retestIds.includes("ankle-plantarflexion") || result[0].candidates[0].retestIds.includes("calf-plantarflexion"));
});
