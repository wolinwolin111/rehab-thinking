import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/followup/followup-review-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("a resolved range retest replaces an earlier same-session limited review", () => {
  const result = core.mergeSessionReviewResults(
    [{ id: "motion:knee-extension", label: "膝关节伸直", result: "same" }],
    { "motion:knee-extension": "same" },
    [{ rangeOutcomes: { "knee-extension": "both-match" } }],
  );
  assert.deepEqual(result, [{ id: "motion:knee-extension", label: "膝关节伸直", result: "better" }]);
});

test("partly improved range remains unresolved for the next session", () => {
  const result = core.mergeSessionReviewResults([], {}, [{ rangeOutcomes: { "calf-dorsiflexion": "better-passive-limited" } }]);
  assert.equal(result[0].result, "same");
});

test("resolved review ids are omitted while unrecorded baseline ids stay eligible", () => {
  const previous = { reviewResults: [
    { id: "motion:knee-extension", label: "伸直", result: "better" },
    { id: "motion:knee-flexion", label: "弯曲", result: "same" },
  ] };
  const unresolved = core.unresolvedReviewIds(previous);
  assert.equal(unresolved.has("motion:knee-extension"), false);
  assert.equal(unresolved.has("motion:knee-flexion"), true);
});

test("unknown and unable answers replace stale findings without becoming normal", () => {
  const result = core.mergeSessionReviewResults(
    [
      { id: "motion:knee-extension", label: "膝关节伸直", result: "same" },
      { id: "strength:ankle-eversion", label: "踝外翻力量", result: "worse" },
    ],
    {
      "motion:knee-extension": "unknown",
      "strength:ankle-eversion": "unable",
    },
    [],
  );
  assert.deepEqual(result.map((item) => item.result), ["unknown", "unable"]);
  const unresolved = core.unresolvedReviewIds({ reviewResults: result });
  assert.equal(unresolved.has("motion:knee-extension"), true);
  assert.equal(unresolved.has("strength:ankle-eversion"), true);
});

test("a follow-up score is never compared before the user records it", () => {
  assert.equal(core.compareFollowupScore({ currentScore: 0, currentConfirmed: false, previousScore: 4 }), "pending");
  assert.equal(core.compareFollowupScore({ currentScore: 6, currentConfirmed: true, previousScore: 4 }), "worse");
  assert.equal(core.compareFollowupScore({ currentScore: 3, currentConfirmed: true, previousScore: 4 }), "better");
});

test("the next session uses the immediately preceding ending score", () => {
  const history = [
    { sessionNumber: 1, endingScore: 5 },
    { sessionNumber: 2, endingScore: 3 },
  ];
  assert.equal(core.previousSessionEndingScore(history, 3, 9), 3);
  assert.equal(core.previousSessionEndingScore(history, 2, 9), 5);
  assert.equal(core.previousSessionEndingScore([], 2, 9), 9);
});

test("first assessment results become explicit saved session states", () => {
  assert.equal(core.trendFromAssessmentResult("normal"), "better");
  assert.equal(core.trendFromAssessmentResult("limited"), "same");
  assert.equal(core.trendFromAssessmentResult("weak"), "same");
  assert.equal(core.trendFromAssessmentResult("unknown"), "unknown");
  assert.equal(core.trendFromAssessmentResult("not-testable"), "unknown");
});

test("a post-treatment alias replaces the original assessment action", () => {
  const canonicalize = (id) => id.replace(/^motion:/, "").replace("thigh-front-length", "knee-flexion");
  const result = core.mergeSessionReviewResults(
    [{ id: "motion:thigh-front-length", label: "大腿前侧拉长", result: "same" }],
    {},
    [{ rangeOutcomes: { "knee-flexion": "both-match" } }],
    canonicalize,
  );
  assert.deepEqual(result, [{ id: "motion:thigh-front-length", label: "大腿前侧拉长", result: "better" }]);
});
