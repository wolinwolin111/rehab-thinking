import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/followup/next-session-recommendation-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

const base = { acute: false, hasSwelling: false, hasImmediateTreatment: false, hasUnresolvedMobility: false, hasTraining: true, trainingStage: 2, waitingForMedicalClearance: false, worsened: false };

test("acute swelling is observed before a formal 2-3 day review", () => {
  const result = core.recommendNextSession({ ...base, acute: true, hasSwelling: true });
  assert.equal(result.earliestDays, 2);
  assert.equal(result.latestDays, 3);
  assert.match(result.interimChecks.join(" "), /第二天/);
});

test("stable mobility treatment uses a 3-7 day review window", () => {
  const result = core.recommendNextSession({ ...base, hasImmediateTreatment: true, hasUnresolvedMobility: true });
  assert.deepEqual([result.earliestDays, result.latestDays], [3, 7]);
});

test("advanced training allows a longer review window", () => {
  const result = core.recommendNextSession({ ...base, trainingStage: 4 });
  assert.deepEqual([result.earliestDays, result.latestDays], [7, 14]);
});

test("medical clearance blocks an automatic date", () => {
  const result = core.recommendNextSession({ ...base, waitingForMedicalClearance: true });
  assert.equal(result.mode, "medical-clearance");
  assert.equal(result.earliestDays, undefined);
});

test("date range is based on the completed session date", () => {
  const result = core.recommendNextSession({ ...base, hasImmediateTreatment: true });
  assert.equal(core.formatRecommendedDateRange(new Date("2026-08-14T12:00:00+08:00"), result), "8/17～8/21");
});
