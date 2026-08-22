import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/action-identity-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("calf motion names share the same physical ankle action", () => {
  assert.equal(core.canonicalActionIdFromAssessmentId("calf-dorsiflexion"), "ankle-dorsiflexion");
  assert.equal(core.canonicalActionKey("勾脚"), "ankle-dorsiflexion");
  assert.equal(core.canonicalActionKey("踝背屈检查"), "ankle-dorsiflexion");
  assert.equal(core.canonicalActionKey("脚底向外转"), "ankle-eversion");
  assert.deepEqual(core.dedupeAssessmentIdsByAction(["calf-dorsiflexion", "ankle-dorsiflexion"]), ["calf-dorsiflexion"]);
});

test("front thigh length and knee bending are one retest action", () => {
  assert.equal(core.canonicalActionIdFromAssessmentId("thigh-front-length"), "knee-flexion");
  assert.equal(core.canonicalActionKey("弯膝盖"), "knee-flexion");
  assert.equal(core.canonicalActionKey("大腿前侧拉长检查"), "knee-flexion");
  assert.deepEqual(core.dedupeAssessmentIdsByAction(["thigh-front-length", "knee-flexion"]), ["thigh-front-length"]);
});

test("combined retest labels deduplicate aliases before comparison", () => {
  assert.equal(core.canonicalActionKey("勾脚、踝背屈检查"), "ankle-dorsiflexion");
  assert.equal(core.canonicalActionKey("弯膝盖、大腿前侧拉长检查"), "knee-flexion");
});

test("patella directions kinematically relate to knee flexion and extension", () => {
  assert.equal(core.treatmentRelatesToChief(["knee-patella-inferior"], "knee-flexion"), true);
  assert.equal(core.treatmentRelatesToChief(["knee-patella-superior"], "knee-extension"), true);
  assert.equal(core.treatmentRelatesToChief(["knee-patella-lateral"], "knee-flexion"), true);
  assert.equal(core.treatmentRelatesToChief(["knee-patella-superior"], "knee-flexion"), false);
  assert.equal(core.treatmentRelatesToChief(["ankle-dorsiflexion"], "knee-flexion"), false);
  assert.equal(core.treatmentRelatesToChief(["knee-patella-inferior"], ""), false);
});

test("composite and extra prefixes normalize to the same physical action", () => {
  assert.equal(core.canonicalActionIdFromAssessmentId("symptom:motion:knee-flexion"), "knee-flexion");
  assert.equal(core.canonicalActionIdFromAssessmentId("track:motion:knee-flexion"), "knee-flexion");
  assert.equal(core.canonicalActionIdFromAssessmentId("tension:motion:knee-flexion"), "knee-flexion");
  assert.equal(core.canonicalActionIdFromAssessmentId("motion:knee-flexion"), "knee-flexion");
});

test("actionIdFromFinding strips composite prefixes for dedup", () => {
  assert.equal(core.actionIdFromFinding({ id: "symptom:motion:knee-flexion" }), "knee-flexion");
  assert.equal(core.actionIdFromFinding({ id: "motion:knee-flexion" }), "knee-flexion");
  assert.equal(core.samePhysicalAction("symptom:motion:knee-flexion", "motion:knee-flexion"), true);
});

test("historical action maps read aliases as the same physical action", () => {
  const values = { "motion:calf-eversion": "both-match", "motion:knee-flexion": "passive-limited" };
  assert.equal(core.valueForPhysicalAction(values, "motion:ankle-eversion"), "both-match");
  assert.equal(core.valueForPhysicalAction(values, "ankle-eversion"), "both-match");
  assert.equal(core.valueForPhysicalAction(values, "motion:knee-extension"), undefined);
  assert.equal(core.motionWasSymptomatic("ankle-eversion", { "motion:calf-eversion": { discomfort: "yes" } }), true);
});
