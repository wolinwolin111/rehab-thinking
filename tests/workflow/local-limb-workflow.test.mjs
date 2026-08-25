import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadTypeScriptModule } from "../support/load-typescript-module.mjs";
import { readRehabMindUiSource } from "../support/read-rehabmind-ui-source.mjs";

const engine = await loadTypeScriptModule("./src/domain/rehab/shared/pilot-decision-engine.ts");

const base = {
  userRole: "general", onset: "1～6周", mechanism: "跑跳或拉伤", symptomType: "牵扯或紧绷",
  symptoms: [], symptomsConfirmed: true, provocationTypes: ["运动过程中"], provocationConfirmed: true,
  baselineScoreConfirmed: true, goal: 4,
};

test("posterior thigh complaint stays in the posterior local chain", () => {
  const input = { ...base, regionIds: ["thigh-local"], locations: ["大腿后侧中段"], currentTask: "冲刺时大腿后侧拉扯" };
  const available = ["motion:thigh-front-length", "motion:thigh-back-length", "motion:thigh-medial-length", "motion:thigh-lateral-load", "strength:thigh-back-strength", "function:thigh-walk", "motion:knee-extension"];
  const ids = engine.rankPilotAssessmentIds(input, available);
  assert.ok(ids.includes("motion:thigh-back-length"));
  assert.ok(ids.includes("motion:thigh-lateral-load"));
  assert.ok(ids.includes("function:thigh-walk"));
  assert.equal(ids.some((id) => id.includes("thigh-front") || id.includes("knee-")), false);
});

test("posterior calf complaint does not open the ankle four-direction checklist", () => {
  const input = { ...base, regionIds: ["calf-local"], locations: ["小腿后侧"], currentTask: "跑步蹬地时小腿后侧疼" };
  const available = ["motion:calf-dorsiflexion", "motion:calf-plantarflexion", "motion:calf-inversion", "motion:calf-eversion", "strength:calf-heel-raise-strength", "function:calf-walk", "motion:ankle-inversion"];
  const ids = engine.rankPilotAssessmentIds(input, available);
  assert.ok(ids.includes("motion:calf-plantarflexion"));
  assert.ok(ids.includes("motion:calf-dorsiflexion"));
  assert.ok(ids.includes("function:calf-walk"));
  assert.equal(ids.some((id) => id.includes("calf-inversion") || id.includes("calf-eversion") || id.includes("ankle-")), false);
});

test("a local complaint keeps its matching function and high-value support motion", () => {
  const input = { ...base, regionIds: ["thigh-local"], locations: ["大腿前侧上段"], currentTask: "起身" };
  const available = ["motion:thigh-front-length", "motion:thigh-back-length", "strength:thigh-front-strength", "function:thigh-sit-stand", "function:thigh-walk"];
  const ids = engine.rankPilotAssessmentIds(input, available);
  assert.ok(ids.includes("motion:thigh-front-length"));
  assert.ok(ids.includes("motion:thigh-back-length"));
  assert.ok(ids.includes("function:thigh-sit-stand"));
});

test("vague local complaints add one opposing direction without opening the full region", () => {
  const input = { ...base, regionIds: ["thigh-local"], locations: ["大腿外侧"], currentTask: "" };
  const available = ["motion:thigh-front-length", "motion:thigh-back-length", "motion:thigh-medial-length", "motion:thigh-lateral-load", "function:thigh-walk"];
  const ids = engine.rankPilotAssessmentIds(input, available);
  assert.deepEqual(ids, ["motion:thigh-lateral-load", "motion:thigh-medial-length", "function:thigh-walk"]);
});

test("medial calf loading adds the opposing control direction without opening all four", () => {
  const input = { ...base, regionIds: ["calf-local"], locations: ["小腿内侧"], currentTask: "走路时足弓内侧不舒服" };
  const available = ["motion:calf-dorsiflexion", "motion:calf-plantarflexion", "motion:calf-inversion", "motion:calf-eversion", "function:calf-walk"];
  const ids = engine.rankPilotAssessmentIds(input, available);
  assert.deepEqual(ids, ["motion:calf-inversion", "motion:calf-eversion", "function:calf-walk"]);
});

test("local findings generate one source-backed treatment chain", () => {
  const input = { ...base, regionIds: ["calf-local"], locations: ["小腿外侧"], currentTask: "跑步时小腿外侧酸" };
  const findings = [
    { id: "motion:calf-eversion", result: "painful" },
    { id: "strength:calf-evertor-strength", result: "weak" },
  ];
  const units = engine.buildPilotTreatmentUnits(input, findings);
  assert.equal(units.filter((unit) => unit.id === "calf-lateral-release").length, 1);
  assert.equal(units.filter((unit) => unit.id === "calf-lateral-control").length, 1);
  assert.equal(units.some((unit) => unit.id.startsWith("ankle-")), false);
});

test("location picker keeps one main region while allowing several precise complaint sites", async () => {
  const source = await readFile(new URL("../../src/features/rehabmind/components/assessment/lower-limb-location-picker.tsx", import.meta.url), "utf8");
  assert.match(source, /id: "thigh"[^\n]+regionId: "thigh-local"/);
  assert.match(source, /id: "calf"[^\n]+regionId: "calf-local"/);
  assert.doesNotMatch(source, /mode === "complaint" \? 1/);
  assert.match(source, /mode === "complaint"/);
  assert.match(source, /const mixesMainAreas = value\.some/);
  assert.match(source, /if \(mixesMainAreas\)/);
  assert.match(source, /onChange\(\[\.\.\.value, nextItem\]\)/);
});

test("restored and decision input preserve all complaint sites in the selected main area", async () => {
  const source = await readRehabMindUiSource();
  assert.match(source, /const selectedLocations = intake\.bodyLocations/);
  assert.match(source, /selectedLocations\.map\(\(item\) => item\.regionId\)/);
  assert.match(source, /selectedLocations\.map\(\(item\) => item\.location\)/);
  assert.match(source, /const savedBodyLocations = snapshot\.intake\.bodyLocations\?\.filter/);
  assert.match(source, /bodyLocations: savedBodyLocations\.length \? savedBodyLocations/);
  assert.match(source, /sideFromLocationSelections\(savedBodyLocations\)/);
  assert.match(source, /location: intake\.bodyLocations\.map\(\(item\) => item\.location\)\.join\("、"\)/);
});
