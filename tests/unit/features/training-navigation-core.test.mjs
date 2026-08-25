import assert from "node:assert/strict";
import test from "node:test";
import { loadTypeScriptModule } from "../../support/load-typescript-module.mjs";

const navigation = await loadTypeScriptModule("./src/features/rehabmind/workflow/training-navigation-core.ts");
const ids = ["exercise-a", "exercise-b", "exercise-c"];

test("first feedback advances to the next training exercise", () => {
  assert.equal(navigation.nextTrainingExerciseId(ids, "exercise-a", { hadFeedback: false, worsened: false }), "exercise-b");
  assert.equal(navigation.nextTrainingExerciseId(ids, "exercise-b", { hadFeedback: false, worsened: false }), "exercise-c");
  assert.equal(navigation.nextTrainingExerciseId(ids, "exercise-c", { hadFeedback: false, worsened: false }), null);
});

test("editing old feedback or reporting worsening keeps the current exercise visible", () => {
  assert.equal(navigation.nextTrainingExerciseId(ids, "exercise-a", { hadFeedback: true, worsened: false }), null);
  assert.equal(navigation.nextTrainingExerciseId(ids, "exercise-a", { hadFeedback: false, worsened: true }), null);
  assert.equal(navigation.nextTrainingExerciseId(ids, "missing", { hadFeedback: false, worsened: false }), null);
});
