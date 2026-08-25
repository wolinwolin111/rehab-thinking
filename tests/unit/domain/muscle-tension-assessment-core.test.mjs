import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/assessment/muscle-tension-assessment-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

const base = { spinal: false, tissuePathwayId: "standard", symptomType: "酸痛", symptoms: [] };

test("default: a motion gets the muscle-tension check even with normal range", () => {
  assert.equal(core.needsMuscleTensionCheck(base), true);
});

test("spinal, contusion, bone stress and neural symptoms skip the tension check", () => {
  assert.equal(core.needsMuscleTensionCheck({ ...base, spinal: true }), false);
  assert.equal(core.needsMuscleTensionCheck({ ...base, tissuePathwayId: "muscle-contusion" }), false);
  assert.equal(core.needsMuscleTensionCheck({ ...base, tissuePathwayId: "bone-stress-suspected" }), false);
  assert.equal(core.needsMuscleTensionCheck({ ...base, symptomType: "麻或电感" }), false);
  assert.equal(core.needsMuscleTensionCheck({ ...base, symptoms: ["麻、电或感觉变化"] }), false);
});

test("swelling no longer skips the whole check — surrounding muscle is still compared", () => {
  assert.equal(core.needsMuscleTensionCheck({ ...base, symptoms: ["肿胀或淤青"] }), true);
});

test("tendon-load still checks tension of surrounding muscle", () => {
  assert.equal(core.needsMuscleTensionCheck({ ...base, tissuePathwayId: "tendon-load" }), true);
});

test("confirmed tension becomes one finding per location", () => {
  assert.deepEqual(core.buildMuscleTensionFindings({ assessmentId: "motion:calf-dorsiflexion", assessmentTitle: "踝背屈", locations: ["小腿前侧", "小腿前侧", "小腿后侧"] }), [
    {
      id: "tension:motion:calf-dorsiflexion:小腿前侧",
      title: "小腿前侧按压反应更明显",
      detail: "两侧轻按时该区域更酸或更胀；仅作为辅助证据，相关动作：踝背屈",
      location: "小腿前侧",
    },
    {
      id: "tension:motion:calf-dorsiflexion:小腿后侧",
      title: "小腿后侧按压反应更明显",
      detail: "两侧轻按时该区域更酸或更胀；仅作为辅助证据，相关动作：踝背屈",
      location: "小腿后侧",
    },
  ]);
  assert.deepEqual(core.buildMuscleTensionFindings({ assessmentId: "motion:calf-dorsiflexion", assessmentTitle: "踝背屈", locations: ["小腿前侧"], professional: true })[0], {
    id: "tension:motion:calf-dorsiflexion:小腿前侧",
    title: "小腿前侧张力或按压阻力增高",
    detail: "与另一侧比较张力或按压阻力增高；相关动作：踝背屈",
    location: "小腿前侧",
  });
  assert.deepEqual(core.buildMuscleTensionFindings({ assessmentId: "motion:calf-dorsiflexion", assessmentTitle: "踝背屈", locations: ["没有明显差别"] }), []);
});

test("bilateral tension keeps the side on the finding instead of treating the region as global", () => {
  const findings = core.buildMuscleTensionFindings({
    assessmentId: "shared:pilot-muscle-tension",
    assessmentTitle: "膝关节伸直",
    locations: ["左侧｜大腿前侧", "右侧｜大腿前侧"],
  });
  assert.deepEqual(findings.map((finding) => finding.side), ["左侧", "右侧"]);
  assert.deepEqual(findings.map((finding) => finding.location), ["大腿前侧", "大腿前侧"]);
});
