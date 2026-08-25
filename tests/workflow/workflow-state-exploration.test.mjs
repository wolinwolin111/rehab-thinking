import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadTypeScriptModule } from "../support/load-typescript-module.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const workflow = await loadTypeScriptModule(
  path.join(rootDir, "src/features/rehabmind/workflow/workflow-orchestrator.ts"),
  { rootDir },
);

function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function replay(seed, events) {
  let currentStep = 0;
  let maxUnlocked = 0;
  for (const event of events) {
    if (event.unlock) maxUnlocked = Math.min(5, maxUnlocked + 1);
    const decision = workflow.orchestrateWorkflowNavigation({ currentStep, maxUnlocked, event: event.value });
    const navigation = decision.commands.find((command) => command.type === "navigate-to-step");
    if (navigation) currentStep = navigation.step;
    if (currentStep > maxUnlocked) return { failed: true, currentStep, maxUnlocked, event };
    if (!decision.allowed && decision.commands.length) return { failed: true, currentStep, maxUnlocked, event };
    if (event.value.type === "edit-requested" && !event.value.explicitlyEnabled
      && decision.commands.some((command) => command.type === "open-explicit-edit")) {
      return { failed: true, currentStep, maxUnlocked, event };
    }
  }
  return { failed: false };
}

function shrink(seed, events) {
  let minimal = [...events];
  for (let index = 0; index < minimal.length;) {
    const candidate = minimal.slice(0, index).concat(minimal.slice(index + 1));
    if (replay(seed, candidate).failed) minimal = candidate;
    else index += 1;
  }
  return minimal;
}

test("A4 seeded navigation exploration preserves stage and edit invariants", () => {
  for (let seed = 1; seed <= 120; seed += 1) {
    const next = random(seed);
    const events = Array.from({ length: 80 }, () => {
      const targetStep = Math.floor(next() * 6);
      const kind = Math.floor(next() * 3);
      return {
        unlock: next() > 0.72,
        value: kind === 0
          ? { type: "navigate-requested", targetStep }
          : kind === 1
            ? { type: "review-requested", targetStep }
            : { type: "edit-requested", targetStep, explicitlyEnabled: next() > 0.5 },
      };
    });
    const result = replay(seed, events);
    assert.equal(result.failed, false, `seed=${seed} minimal=${JSON.stringify(shrink(seed, events))}`);
  }
});
