import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/muscle-tension-assessment-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

const base = { spinal: false, tissuePathwayId: "standard", symptomType: "酸痛", symptoms: [] };

test("default: a motion gets the muscle-tension check even with normal range", () => {
  assert.equal(core.needsMuscleTensionCheck(base), true);
});

test("spinal, contusion, bone stress, swelling and neural symptoms skip the tension check", () => {
  assert.equal(core.needsMuscleTensionCheck({ ...base, spinal: true }), false);
  assert.equal(core.needsMuscleTensionCheck({ ...base, tissuePathwayId: "muscle-contusion" }), false);
  assert.equal(core.needsMuscleTensionCheck({ ...base, tissuePathwayId: "bone-stress-suspected" }), false);
  assert.equal(core.needsMuscleTensionCheck({ ...base, symptoms: ["肿胀或淤青"] }), false);
  assert.equal(core.needsMuscleTensionCheck({ ...base, symptomType: "麻或电感" }), false);
  assert.equal(core.needsMuscleTensionCheck({ ...base, symptoms: ["麻、电或感觉变化"] }), false);
});

test("tendon-load still checks tension of surrounding muscle", () => {
  assert.equal(core.needsMuscleTensionCheck({ ...base, tissuePathwayId: "tendon-load" }), true);
});

test("confirmed tension becomes one finding per location", () => {
  assert.deepEqual(core.buildMuscleTensionFindings({ assessmentId: "motion:calf-dorsiflexion", assessmentTitle: "踝背屈", locations: ["小腿前侧", "小腿前侧", "小腿后侧"] }), [
    {
      id: "tension:motion:calf-dorsiflexion:小腿前侧",
      title: "小腿前侧肌张力增高",
      detail: "与另一侧轻按比较更紧或更酸；相关动作：踝背屈",
      location: "小腿前侧",
    },
    {
      id: "tension:motion:calf-dorsiflexion:小腿后侧",
      title: "小腿后侧肌张力增高",
      detail: "与另一侧轻按比较更紧或更酸；相关动作：踝背屈",
      location: "小腿后侧",
    },
  ]);
  assert.deepEqual(core.buildMuscleTensionFindings({ assessmentId: "motion:calf-dorsiflexion", assessmentTitle: "踝背屈", locations: ["没有明显差别"] }), []);
});
