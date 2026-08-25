import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/training/home-relaxation-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

const safeBase = {
  tissuePathwayId: "standard",
  symptoms: [],
  stabbingPalpation: "",
  symptomType: "",
  tensionLabels: [],
  effectiveMuscleLabels: [],
  trainingMuscleLabels: [],
};

test("merges tension, effective treatment, and training muscles with dedup across sources", () => {
  const targets = core.buildHomeRelaxationTargets({
    ...safeBase,
    tensionLabels: ["小腿后侧肌群", "大腿前侧肌群"],
    effectiveMuscleLabels: ["小腿后侧肌群", "大腿外侧链"],
    trainingMuscleLabels: ["大腿前侧肌群", "小腿外侧肌群"],
  });
  assert.deepEqual(
    targets.map((target) => target.location),
    ["小腿后侧肌群", "大腿前侧肌群", "大腿外侧链", "小腿外侧肌群"],
  );
});

test("dedups repeated labels inside a single source", () => {
  const targets = core.buildHomeRelaxationTargets({
    ...safeBase,
    tensionLabels: ["小腿后侧肌群", "小腿后侧肌群", "小腿后侧肌群"],
  });
  assert.deepEqual(targets.map((target) => target.location), ["小腿后侧肌群"]);
});

test("dedups a generic treatment label with its side-specific tension result", () => {
  const targets = core.buildHomeRelaxationTargets({
    ...safeBase,
    tensionLabels: ["右侧｜大腿前侧肌群"],
    effectiveMuscleLabels: ["大腿前侧肌群"],
  });
  assert.deepEqual(targets.map((target) => target.location), ["右侧｜大腿前侧肌群"]);
});

test("does not hard-cap distinct relaxation targets", () => {
  const targets = core.buildHomeRelaxationTargets({
    ...safeBase,
    tensionLabels: ["a", "b", "c", "d", "e"],
  });
  assert.equal(targets.length, 5);
});

test("legacy maxTargets input does not truncate the knowledge output", () => {
  const targets = core.buildHomeRelaxationTargets({
    ...safeBase,
    tensionLabels: ["a", "b", "c", "d"],
    maxTargets: 2,
  });
  assert.equal(targets.length, 4);
});

test("drops no-difference sentinel locations", () => {
  const targets = core.buildHomeRelaxationTargets({
    ...safeBase,
    tensionLabels: ["没有明显差别", "两侧感觉接近", "暂不判断", "小腿后侧肌群"],
  });
  assert.deepEqual(targets.map((target) => target.location), ["小腿后侧肌群"]);
});

test("each target carries the self-release card fields", () => {
  const [target] = core.buildHomeRelaxationTargets({
    ...safeBase,
    tensionLabels: ["小腿后侧肌群"],
  });
  assert.equal(target.id, "home-release:小腿后侧肌群");
  assert.equal(target.title, "小腿后侧肌群自主放松");
  assert.ok(target.dosage.length > 0);
  assert.ok(target.instruction.includes("小腿后侧肌群"));
  assert.ok(target.limit.length > 0);
});

test("unsafe scenarios keep targets and add a selective-avoidance note", () => {
  const withTension = { ...safeBase, tensionLabels: ["小腿后侧肌群"] };
  assert.equal(core.buildHomeRelaxationTargets(withTension).length, 1);
  const cases = [
    { variant: { tissuePathwayId: "muscle-contusion" }, note: "避开淤青血肿中心" },
    { variant: { tissuePathwayId: "bone-stress-suspected" }, note: "避开局限骨性压痛点" },
    { variant: { tissuePathwayId: "tendon-load" }, note: "不要直接按压肌腱" },
    { variant: { symptoms: ["肿胀或淤青"] }, note: "避开肿胀部位" },
    { variant: { stabbingPalpation: "sharp" }, note: "避开刺痛点" },
    { variant: { symptomType: "麻或电感" }, note: "避开麻电区域" },
    { variant: { symptoms: ["麻、电或感觉变化"] }, note: "避开麻电区域" },
  ];
  for (const { variant, note } of cases) {
    const targets = core.buildHomeRelaxationTargets({ ...withTension, ...variant });
    assert.equal(targets.length, 1, JSON.stringify(variant));
    assert.ok(targets[0].limit.includes(note), `${JSON.stringify(variant)} should mention ${note}`);
  }
});

test("exerciseMuscleLabels maps muscle-naming tags to standard regions", () => {
  assert.deepEqual(core.exerciseMuscleLabels(["quadriceps", "terminal-extension"], "脚跟滑动与膝后下压"), ["大腿前侧肌群"]);
  assert.deepEqual(core.exerciseMuscleLabels(["glute", "hamstring", "posterior-chain"], "臀桥"), ["臀部与髋后外侧肌群", "大腿后侧与膝后两侧"]);
  assert.deepEqual(core.exerciseMuscleLabels(["adductor", "medial-knee"], "仰卧夹枕"), ["大腿内侧与鹅足周围"]);
  assert.deepEqual(core.exerciseMuscleLabels(["calf", "heel-raise"], "扶墙双脚提踵"), ["小腿后侧肌群"]);
  assert.deepEqual(core.exerciseMuscleLabels(["tibialis-anterior", "toe-extensor", "dorsiflexion"], "勾脚与抬脚趾控制"), ["小腿前侧肌群"]);
  assert.deepEqual(core.exerciseMuscleLabels(["tibialis-posterior", "arch", "foot-intrinsic"], "仰卧足弓控制"), ["小腿后内侧肌群", "足底与足弓肌群"]);
  assert.deepEqual(core.exerciseMuscleLabels(["peroneal", "eversion"], "脚掌向外推的力量"), ["小腿外侧肌群"]);
});

test("exerciseMuscleLabels leaves pure movement-pattern tags unmapped", () => {
  assert.deepEqual(core.exerciseMuscleLabels(["jump", "landing", "change-direction"], "跳跃落地与减速"), []);
  assert.deepEqual(core.exerciseMuscleLabels(["sit-to-stand", "squat", "movement-pattern"], "坐站与浅蹲"), []);
});
