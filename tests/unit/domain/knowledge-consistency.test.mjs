import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const knowledge = await loadTypeScriptModule("./src/knowledge/pilot/pilot-knowledge.ts");
const content = await loadTypeScriptModule("./src/knowledge/pilot/full-demo-content.ts");
const motion = await loadTypeScriptModule("./src/knowledge/pilot/pilot-motion-muscle-knowledge.ts");
const validator = await loadTypeScriptModule("./src/knowledge/pilot/knowledge-consistency.ts");

test("A6 KNOW-01: all pilot knowledge references and permission markers are internally consistent", () => {
  assert.deepEqual(validator.validatePilotKnowledgeConsistency({
    relations: knowledge.PILOT_RELATIONS,
    regions: content.FULL_REGIONS,
    motionKnowledge: motion.PILOT_MOTION_KNOWLEDGE,
    muscleRegions: motion.PILOT_MUSCLE_REGIONS,
  }), []);
});

test("A6 KNOW-01: missing references, duplicate IDs, and unsafe joint permissions are rejected", () => {
  const relation = knowledge.PILOT_RELATIONS[0];
  const invalid = [
    { ...relation, id: "DUPLICATE", assessmentIds: [...relation.assessmentIds, "motion:not-real"] },
    { ...relation, id: "DUPLICATE", trainingIds: ["training:not-real"], treatmentCandidates: [{
      id: "unsafe-joint", kind: "joint", site: "technical", action: "technical",
      retestIds: relation.assessmentIds.slice(0, 1), reviewTiming: "same-session",
    }] },
  ];
  const codes = validator.validatePilotKnowledgeConsistency({
    relations: invalid,
    regions: content.FULL_REGIONS,
    motionKnowledge: motion.PILOT_MOTION_KNOWLEDGE,
    muscleRegions: motion.PILOT_MUSCLE_REGIONS,
  }).map((issue) => issue.code);
  assert.deepEqual(codes, [
    "KNOW-DUPLICATE-RELATION",
    "KNOW-MISSING-ASSESSMENT",
    "KNOW-MISSING-TRAINING",
    "KNOW-JOINT-PERMISSION",
  ]);
});

test("A6 KNOW-01 is software reference validation, not a clinical review claim", () => {
  assert.equal(validator.PILOT_KNOWLEDGE_CHECK_SCOPE, "software-reference-consistency-only");
});
