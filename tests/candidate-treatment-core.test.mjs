import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

async function loadBundle(paths) {
  const parts = [];
  for (let i = 0; i < paths.length; i++) {
    const src = await readFile(new URL(paths[i], import.meta.url), "utf8");
    let out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    if (i < paths.length - 1) out = out.replace(/export\s+/g, "");
    else out = out.replace(/import\s*\{[^}]*\}\s*from\s*"[^"]*";?/g, "");
    parts.push(out);
  }
  return import(`data:text/javascript;base64,${Buffer.from(parts.join("\n")).toString("base64")}`);
}

const core = await loadBundle([
  "../app/pilot-motion-muscle-knowledge.ts",
  "../app/candidate-treatment-core.ts",
]);

const muscle = {
  id: "muscle:calf-posterior-release",
  title: "今天先安排小腿后侧轻柔松解",
  type: "muscle",
  tags: ["calf", "release"],
  siteLabel: "小腿后侧",
  targetLabel: "",
  actionLabel: "",
  do: "轻柔按压小腿后侧肌腹30秒",
};

test("muscle focus maps a candidate to its standard region label", () => {
  const name = core.candidateTreatmentName(muscle);
  assert.equal(name, "小腿后侧肌群处理单元");
});

test("two muscle candidates in the same region share one dedup key", () => {
  const a = core.candidateDedupKey(muscle);
  const b = core.candidateDedupKey({ ...muscle, id: "muscle:calf-posterior-release-2", title: "小腿后侧放松" });
  assert.equal(a, b);
});

test("patella joint candidates are named with the direction, not as generic joint mobilization", () => {
  const patella = {
    id: "patella-mobility-unit",
    title: "髌骨向上滑动辅助",
    type: "joint",
    tags: ["patella"],
    siteLabel: "髌骨",
    targetLabel: "",
    actionLabel: "髌骨向上滑动辅助",
    do: "由专业人员完成髌骨向上滑动辅助",
  };
  assert.equal(core.candidateTreatmentName(patella), "髌骨向上滑动辅助");
});

test("a joint mobilization title names the object and direction", () => {
  const kneeFlex = {
    id: "joint-mobilization:knee-flexion",
    title: "膝关节屈曲方向松动",
    type: "joint",
    tags: ["joint-mobility"],
    siteLabel: "膝",
    targetLabel: "",
    actionLabel: "膝关节屈曲方向松动",
    do: "由专业人员完成膝关节屈曲方向松动",
  };
  assert.equal(core.candidateTreatmentName(kneeFlex), "膝关节屈曲方向松动");
});

test("patella-specific detection rejects generic knee candidates that merely mention patella", () => {
  const specific = { id: "patella-mobility-unit", type: "joint", title: "髌骨向上滑动辅助", tags: [], actionLabel: "髌骨向上滑动辅助", do: "", siteLabel: "髌骨", targetLabel: "" };
  const generic = { id: "joint-mobilization:knee-extension", type: "joint", title: "检查髌骨、膝关节与近端腓骨", tags: [], actionLabel: "", do: "", siteLabel: "膝", targetLabel: "" };
  assert.equal(core.isPatellaSpecificCandidate(specific), true);
  assert.equal(core.isPatellaSpecificCandidate(generic), false);
});

test("candidateMatchesTensionLocation maps a calf location to a calf candidate", () => {
  const calf = { id: "muscle:calf-release", type: "muscle", tags: [], siteLabel: "小腿后侧", targetLabel: "", actionLabel: "", do: "轻柔松解小腿后侧肌腹", title: "小腿后侧轻柔松解" };
  assert.equal(core.candidateMatchesTensionLocation(calf, "小腿后侧"), true);
  assert.equal(core.candidateMatchesTensionLocation(calf, "大腿前侧"), false);
});
