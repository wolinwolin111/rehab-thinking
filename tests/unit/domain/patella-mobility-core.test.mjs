import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/patella-mobility-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("collects only the passively limited patella directions in stable order", () => {
  assert.deepEqual(core.limitedPatellaDirections({
    "motion:knee-patella-superior": { passive: "limited" },
    "motion:knee-patella-inferior": { passive: "same" },
    "motion:knee-patella-medial": { passive: "limited" },
    "motion:knee-patella-lateral": { passive: "skip" },
  }), ["knee-patella-superior", "knee-patella-medial"]);
});

test("returns an empty list when no patella direction is limited", () => {
  assert.deepEqual(core.limitedPatellaDirections({
    "motion:knee-patella-superior": { passive: "same" },
    "motion:knee-patella-inferior": { passive: "same" },
  }), []);
});

test("builds a direction-specific mobility title from the limited directions", () => {
  assert.equal(core.patellaMobilityUnitTitle(["knee-patella-superior", "knee-patella-medial"]), "髌骨向上、向内滑动辅助");
  assert.equal(core.patellaMobilityUnitTitle(["knee-patella-lateral"]), "髌骨向外滑动辅助");
});

test("keeps a direction in the unit only while it has not reached the comparison target", () => {
  assert.deepEqual(core.remainingPatellaDirections(
    ["knee-patella-superior", "knee-patella-medial"],
    { "motion:knee-patella-superior": "both-match", "motion:knee-patella-medial": "passive-limited" },
  ), ["knee-patella-medial"]);
});

test("an empty remaining set closes the patella unit", () => {
  assert.deepEqual(core.remainingPatellaDirections(
    ["knee-patella-superior"],
    { "motion:knee-patella-superior": "both-match" },
  ), []);
});

test("retest findings keep only the limited directions, not all four", () => {
  const allFindings = [
    { id: "motion:knee-patella-superior" },
    { id: "motion:knee-patella-inferior" },
    { id: "motion:knee-patella-medial" },
    { id: "motion:knee-patella-lateral" },
  ];
  assert.deepEqual(
    core.filterPatellaFindingsToLimited(allFindings, ["knee-patella-superior", "knee-patella-medial"]).map((f) => f.id),
    ["motion:knee-patella-superior", "motion:knee-patella-medial"],
  );
  assert.deepEqual(core.filterPatellaFindingsToLimited(allFindings, ["knee-patella-superior"]).map((f) => f.id), ["motion:knee-patella-superior"]);
  assert.deepEqual(core.filterPatellaFindingsToLimited(allFindings, []), []);
});
