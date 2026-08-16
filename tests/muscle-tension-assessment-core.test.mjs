import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/muscle-tension-assessment-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

const base = { spinal: false, active: "same", localRegion: true, standardPath: true, acute: false, localPhase: "nonacute-tension", primaryLocalMotion: true, symptomType: "酸痛", discomfort: "no", familiarSymptom: "no", hasClearChiefAction: true };

test("normal calf range with familiar pain still receives one muscle-tension check", () => {
  assert.equal(core.needsMuscleTensionCheck({ ...base, discomfort: "yes" }), true);
});

test("local calf tightness can trigger the primary tension check without range loss", () => {
  assert.equal(core.needsMuscleTensionCheck(base), true);
});

test("acute local injury and unrelated normal motion do not create routine palpation", () => {
  assert.equal(core.needsMuscleTensionCheck({ ...base, acute: true, discomfort: "yes" }), false);
  assert.equal(core.needsMuscleTensionCheck({ ...base, primaryLocalMotion: false, symptomType: "疼痛，性质说不清" }), false);
});

test("confirmed tension becomes a categorized finding even when range is normal", () => {
  assert.deepEqual(core.buildMuscleTensionFinding({ assessmentId: "motion:calf-dorsiflexion", assessmentTitle: "踝背屈", locations: ["小腿前侧", "小腿前侧"] }), {
    id: "tension:motion:calf-dorsiflexion",
    title: "小腿前侧肌张力增高",
    detail: "与另一侧轻按比较更紧或更酸；相关动作：踝背屈",
  });
  assert.equal(core.buildMuscleTensionFinding({ assessmentId: "motion:calf-dorsiflexion", assessmentTitle: "踝背屈", locations: ["没有明显差别"] }), null);
});
