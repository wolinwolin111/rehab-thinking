import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const history = await loadTypeScriptModule("./src/features/rehabmind/workflow/session-history.ts");

function summary(sessionNumber, endingScore, overrides = {}) {
  return {
    sessionNumber,
    completedAt: `2026-08-${20 + sessionNumber}T08:00:00.000Z`,
    location: "右膝 · 膝内侧关节线",
    startedScore: endingScore + 2,
    endingScore,
    reviewResults: [],
    treatments: [],
    continuedEffectiveTreatments: [],
    stoppedTreatments: [],
    resolvedProblems: [],
    training: [],
    nextFocus: [],
    ...overrides,
  };
}

test("HISTORY-01: cross-session trend is ordered and excludes unscored sessions", () => {
  const input = [summary(3, 2), summary(1, 7), summary(2, undefined)];
  assert.deepEqual(history.sessionScoreTrend(input), [
    { sessionNumber: 1, score: 7 },
    { sessionNumber: 3, score: 2 },
  ]);
});

test("HISTORY-02: saving the same session updates it without duplicating history", () => {
  const first = summary(1, 7);
  const second = summary(2, 4);
  const revisedFirst = summary(1, 5, { nextFocus: ["复查下楼"] });
  const result = history.upsertSessionSummary([first, second], revisedFirst);

  assert.deepEqual(result.map((item) => item.sessionNumber), [1, 2]);
  assert.equal(result[0].endingScore, 5);
  assert.deepEqual(result[0].nextFocus, ["复查下楼"]);
});

test("HISTORY-03: a new session keeps prior session location and treatment evidence", () => {
  const first = summary(1, 7, {
    location: "右膝 · 膝内侧关节线",
    continuedEffectiveTreatments: ["股四头肌放松"],
  });
  const second = summary(2, 4, {
    location: "右踝 · 外踝",
    nextFocus: ["确认新问题"],
  });
  const result = history.upsertSessionSummary([first], second);

  assert.equal(result[0].location, "右膝 · 膝内侧关节线");
  assert.deepEqual(result[0].continuedEffectiveTreatments, ["股四头肌放松"]);
  assert.equal(result[1].location, "右踝 · 外踝");
  assert.deepEqual(history.latestSessionSummary(result).nextFocus, ["确认新问题"]);
});

