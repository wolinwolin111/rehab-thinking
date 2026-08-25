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
  "../../../src/knowledge/pilot/pilot-motion-muscle-knowledge.ts",
  "../../../src/domain/rehab/treatment/candidate-treatment-core.ts",
  "../../../src/domain/rehab/treatment/candidate-action-core.ts",
]);

const muscle = { id: "muscle:calf-posterior-release", type: "muscle", title: "小腿后侧轻柔松解", do: "轻柔松解小腿后侧肌腹30秒", tags: ["calf", "release"], retestIds: ["ankle-dorsiflexion", "ankle-plantarflexion"], siteLabel: "小腿后侧", targetLabel: "" };

test("muscle candidate control motion ids keep agonist directions only", () => {
  const ids = core.candidateControlMotionIds(muscle, ["ankle-dorsiflexion", "ankle-plantarflexion"]);
  assert.deepEqual(ids, ["ankle-plantarflexion"]);
});

test("muscle candidate action includes release, dosage and control when applicable", () => {
  const action = core.candidateAction(muscle);
  assert.ok(action.includes("轻柔松解小腿后侧肌腹"));
  assert.ok(action.includes("力度从轻到中等"));
});

test("joint candidate action is passive, low-stimulus and names the direction", () => {
  const joint = { id: "joint-mobilization:knee-flexion", type: "joint", title: "膝关节屈曲方向松动", do: "由专业人员完成膝关节屈曲方向松动", tags: ["joint-mobility"], retestIds: ["knee-flexion"], siteLabel: "膝", targetLabel: "" };
  const action = core.candidateAction(joint);
  assert.ok(action.includes("膝关节屈曲方向松动"));
  assert.ok(action.includes("只处理一个受限方向"));
});

test("control candidate action returns its do text directly", () => {
  const control = { id: "control:ankle-eversion", type: "control", title: "外翻控制", do: "脚掌缓慢向外转再控制回来", tags: [], retestIds: ["ankle-eversion"] };
  assert.equal(core.candidateAction(control), "脚掌缓慢向外转再控制回来");
});
