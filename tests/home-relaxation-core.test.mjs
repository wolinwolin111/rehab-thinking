import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/home-relaxation-core.ts", import.meta.url), "utf8");
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
    maxTargets: 10,
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

test("caps at the default maximum of 3 targets", () => {
  const targets = core.buildHomeRelaxationTargets({
    ...safeBase,
    tensionLabels: ["a", "b", "c", "d", "e"],
  });
  assert.equal(targets.length, 3);
});

test("honours an explicit maxTargets", () => {
  const targets = core.buildHomeRelaxationTargets({
    ...safeBase,
    tensionLabels: ["a", "b", "c", "d"],
    maxTargets: 2,
  });
  assert.equal(targets.length, 2);
});

test("drops no-difference sentinel locations", () => {
  const targets = core.buildHomeRelaxationTargets({
    ...safeBase,
    tensionLabels: ["没有明显差别", "两侧感觉接近", "小腿后侧肌群"],
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

test("unsafe scenarios hide every self-release target", () => {
  const withTension = { ...safeBase, tensionLabels: ["小腿后侧肌群"] };
  assert.equal(core.buildHomeRelaxationTargets(withTension).length, 1);
  const unsafeVariants = [
    { tissuePathwayId: "muscle-contusion" },
    { symptoms: ["肿胀或淤青"] },
    { stabbingPalpation: "sharp" },
    { symptomType: "麻或电感" },
    { symptoms: ["麻、电或感觉变化"] },
  ];
  for (const variant of unsafeVariants) {
    assert.deepEqual(core.buildHomeRelaxationTargets({ ...withTension, ...variant }), [], JSON.stringify(variant));
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
