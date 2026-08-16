import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/assessment-gap-core.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);

test("an incomplete assessment links to the exact motion that needs help", () => {
  const gap = core.firstAssessmentGap(["motion:a", "motion:b"], {
    "motion:a": { active: "same" },
    "motion:b": { active: "unable", unableReason: "instruction" },
  });
  assert.deepEqual(gap, { assessmentId: "motion:b", reason: "motion-instruction" });
  assert.equal(core.assessmentGapActionLabel(gap), "查看简化动作");
});

test("a missing helper links to the self-guided strength version", () => {
  const gap = core.firstAssessmentGap(["strength:a"], {
    "strength:a": { simple: "unable", strengthUnableReason: "no-helper" },
  });
  assert.deepEqual(gap, { assessmentId: "strength:a", reason: "strength-no-helper" });
  assert.equal(core.assessmentGapActionLabel(gap), "改用自助检查");
});

test("a painful function task is a recorded finding, not a missing check", () => {
  const gap = core.firstAssessmentGap(["function:step-down"], {
    "function:step-down": { simple: "unable", functionUnableReason: "pain" },
  });
  assert.equal(gap, null);
});

test("a function task stopped because the instructions were unclear can reopen only that task", () => {
  const gap = core.firstAssessmentGap(["function:step-down"], {
    "function:step-down": { simple: "unable", functionUnableReason: "instruction" },
  });
  assert.deepEqual(gap, { assessmentId: "function:step-down", reason: "motion-instruction" });
});
