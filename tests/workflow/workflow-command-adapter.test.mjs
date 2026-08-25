import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadTypeScriptModule } from "../support/load-typescript-module.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const adapter = await loadTypeScriptModule(
  path.join(rootDir, "src/features/rehabmind/controllers/workflow-command-adapter.ts"),
  { rootDir },
);

test("A4 page adapter maps each production command to one matching UI operation", () => {
  const calls = [];
  adapter.executeWorkflowCommands([
    { type: "select-treatment-candidate", candidateIndex: 2 },
    { type: "select-treatment-target", targetIndex: 3, candidateIndex: 1 },
    { type: "advance-treatment-target" },
    { type: "stop-treatment", reason: "worsened" },
    { type: "clear-pending-queue-advance" },
    { type: "enter-training" },
    { type: "remain-in-treatment" },
    { type: "navigate-to-step", step: 4 },
    { type: "open-readonly-review", step: 2 },
    { type: "open-explicit-edit", step: 2 },
    { type: "start-followup", sessionNumber: 2 },
    { type: "capture-adverse-response", source: "treatment" },
  ], {
    selectTreatmentCandidate: (index) => calls.push(["candidate", index]),
    selectTreatmentTarget: (target, candidate) => calls.push(["target", target, candidate]),
    advanceTreatmentTarget: () => calls.push(["advance"]),
    stopTreatment: (reason) => calls.push(["stop", reason]),
    clearPendingQueueAdvance: () => calls.push(["clear"]),
    enterTraining: () => calls.push(["training"]),
    remainInTreatment: () => calls.push(["remain"]),
    navigateToStep: (step) => calls.push(["navigate", step]),
    openReadonlyReview: (step) => calls.push(["review", step]),
    openExplicitEdit: (step) => calls.push(["edit", step]),
    startFollowup: (session) => calls.push(["followup", session]),
    captureAdverseResponse: (source) => calls.push(["adverse", source]),
  });
  assert.deepEqual(calls, [
    ["candidate", 2],
    ["target", 3, 1],
    ["advance"],
    ["stop", "worsened"],
    ["clear"],
    ["training"],
    ["remain"],
    ["navigate", 4],
    ["review", 2],
    ["edit", 2],
    ["followup", 2],
    ["adverse", "treatment"],
  ]);
});

test("A4 stop command never falls through to queue advancement", () => {
  let advanced = false;
  let stopped = false;
  adapter.executeWorkflowCommands([{ type: "stop-treatment", reason: "worsened" }], {
    advanceTreatmentTarget: () => { advanced = true; },
    stopTreatment: () => { stopped = true; },
  });
  assert.equal(stopped, true);
  assert.equal(advanced, false);
});
