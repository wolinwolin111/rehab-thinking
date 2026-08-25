import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const core = await loadTypeScriptModule("./src/domain/rehab/retest/retest-routing-core.ts");

test("professional partial passive limitation enters joint route", () => {
  assert.equal(core.nextRangeCandidateType("better-passive-limited", true), "joint");
  assert.equal(core.nextRangeCandidateType("passive-limited", true), "joint");
});

test("self-guided partial passive limitation stays on active control route", () => {
  assert.equal(core.nextRangeCandidateType("better-passive-limited", false), "control");
  assert.equal(core.nextRangeCandidateType("passive-limited", false), "control");
  assert.equal(core.nextRangeCandidateType("passive-match-active-limited", true), "control");
});

test("a local calf retest updates the chief score only for the same physical action", () => {
  assert.equal(core.capturesChiefRetestScore("target:local-limb", "calf-dorsiflexion", "ankle-dorsiflexion", true), true);
  assert.equal(core.capturesChiefRetestScore("target:local-limb", "calf-eversion", "ankle-dorsiflexion", true), false);
  assert.equal(core.capturesChiefRetestScore("target:motion:calf-dorsiflexion", "calf-dorsiflexion", "ankle-dorsiflexion", true), true);
});

test("a treatment record captures the chief retest only when the evidence belongs to the chief action", () => {
  const base = {
    timeBased: false,
    deferredRetest: false,
    evidenceCaptured: true,
    targetId: "target:local-limb",
    targetChiefRetestAllowed: true,
    chiefScoreComparable: true,
    activeDirectionId: "ankle-dorsiflexion",
    chiefDirectionId: "ankle-dorsiflexion",
    chiefImprovedDuringTreatment: true,
    chiefRetestCompletedDuringTreatment: false,
  };
  assert.equal(core.shouldCaptureChiefRetest(base), true);
  assert.equal(core.shouldCaptureChiefRetest({ ...base, activeDirectionId: "ankle-plantarflexion" }), false);
  assert.equal(core.shouldCaptureChiefRetest({ ...base, targetId: "target:chief" }), true);
  assert.equal(core.shouldCaptureChiefRetest({ ...base, timeBased: true }), false);
  assert.equal(core.shouldCaptureChiefRetest({ ...base, evidenceCaptured: false }), false);
});

test("range retest requests a chief score only while the chief remains comparable and unresolved", () => {
  const base = {
    isResidualReviewStep: false,
    chiefScoreComparable: true,
    chiefMatchesRange: false,
    hasChiefFunctionAction: false,
    activeTargetId: "target:local-limb",
    targetRelatesToChief: false,
    localNewSourceNeedsChiefRetest: false,
    chiefImprovedDuringTreatment: false,
    chiefRetestCompletedDuringTreatment: false,
  };
  assert.equal(core.shouldRequestChiefRetest(base), true);
  assert.equal(core.shouldRequestChiefRetest({ ...base, chiefImprovedDuringTreatment: true }), false);
  assert.equal(core.shouldRequestChiefRetest({ ...base, localNewSourceNeedsChiefRetest: true, chiefImprovedDuringTreatment: true }), true);
  assert.equal(core.shouldRequestChiefRetest({ ...base, isResidualReviewStep: true }), false);
  assert.equal(core.shouldRequestChiefRetest({ ...base, chiefMatchesRange: true, hasChiefFunctionAction: false }), false);
});

test("range score capture is not confused with a visible but unconfirmed chief score", () => {
  assert.equal(core.chiefRetestWasRecorded({ shouldRequest: true, scoreShownAndRecorded: false, scoreConfirmed: false, rangeScoreCaptured: false }), false);
  assert.equal(core.chiefRetestWasRecorded({ shouldRequest: false, scoreShownAndRecorded: true, scoreConfirmed: true, rangeScoreCaptured: false }), true);
  assert.equal(core.chiefRetestWasRecorded({ shouldRequest: false, scoreShownAndRecorded: false, scoreConfirmed: false, rangeScoreCaptured: true }), true);
});
