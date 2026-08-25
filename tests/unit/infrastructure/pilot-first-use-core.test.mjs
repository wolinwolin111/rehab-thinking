import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const firstUse = await loadTypeScriptModule("./src/infrastructure/pilot/telemetry/first-use-core.ts");

test("FIRST-01: a new user sees value guidance, source, and consent in order", () => {
  assert.equal(firstUse.resolvePilotFirstUseOverlay({ tutorialSeen: false, sourceSelected: false, consent: "missing" }), "tutorial");
  assert.equal(firstUse.reducePilotFirstUseOverlay("tutorial", "tutorial-finished", { sourceSelected: false, consent: "missing" }), "source");
  assert.equal(firstUse.reducePilotFirstUseOverlay("source", "source-selected", { sourceSelected: true, consent: "missing" }), "consent");
});

test("FIRST-02: consent refusal blocks the workspace until reconsidered", () => {
  assert.equal(firstUse.resolvePilotFirstUseOverlay({ tutorialSeen: true, sourceSelected: true, consent: "missing" }), "consent");
  assert.equal(firstUse.resolvePilotFirstUseOverlay({ tutorialSeen: true, sourceSelected: true, consent: "confirmed" }), "workspace");
  assert.equal(firstUse.resolvePilotFirstUseOverlay({ tutorialSeen: true, sourceSelected: true, consent: "declined" }), "blocked");
  assert.equal(firstUse.reducePilotFirstUseOverlay("consent", "consent-declined", { sourceSelected: true, consent: "declined" }), "blocked");
  assert.equal(firstUse.reducePilotFirstUseOverlay("blocked", "consent-reconsidered", { sourceSelected: true, consent: "missing" }), "consent");
});

test("A6 FIRST-01: tutorial outcome changes presentation state only", () => {
  const initial = { tutorialSeen: false, consent: "missing", businessState: { step: 3, revision: 7 } };
  const result = firstUse.applyPilotTutorialOutcome(initial, "skipped");
  assert.deepEqual(result.businessState, initial.businessState);
  assert.equal(result.tutorialSeen, true);
  assert.equal(result.consent, "missing");
});
