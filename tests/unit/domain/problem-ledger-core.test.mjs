import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../../src/domain/rehab/shared/problem-ledger-core.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

test("an empty manual-treatment queue does not erase strength and tracking problems", () => {
  const ledger = core.buildProblemLedger([
    { id: "strength", kind: "力量或控制" },
    { id: "swelling", kind: "肿胀" },
  ], { pathway: "standard", assessmentInsufficient: false });
  assert.deepEqual(ledger.map((item) => item.destination), ["training", "later-review"]);
  assert.equal(core.emptyTreatmentMessage(ledger).title, "本次采用阶段管理");
});

test("a symptomatic motion without a treatment route returns to assessment", () => {
  const ledger = core.buildProblemLedger([
    { id: "motion", kind: "活动度", routed: false },
  ], { pathway: "standard", assessmentInsufficient: false });
  assert.equal(core.hasUnroutedImmediateProblem(ledger), true);
  assert.equal(core.emptyTreatmentMessage(ledger).action, "返回补充检查");
});

test("acute and bone-stress pathways keep explicit non-manual destinations", () => {
  const acute = core.buildProblemLedger([{ id: "chief", kind: "主诉" }], {
    pathway: "muscle-contusion",
    assessmentInsufficient: false,
  });
  const bone = core.buildProblemLedger([{ id: "chief", kind: "主诉" }], {
    pathway: "bone-stress-suspected",
    assessmentInsufficient: false,
  });
  assert.equal(acute[0].destination, "later-review");
  assert.equal(bone[0].destination, "medical-review");
});

test("a routed but unresolved immediate problem stays visible after the queue is empty", () => {
  const ledger = core.buildProblemLedger([
    { id: "chief", kind: "主诉", routed: true, completed: false },
    { id: "range", kind: "活动度", routed: true, completed: false },
    { id: "resolved", kind: "活动度", routed: true, completed: true },
  ], { pathway: "standard", assessmentInsufficient: false });
  assert.deepEqual(core.unresolvedImmediateProblems(ledger).map((entry) => entry.id), ["chief", "range"]);
  assert.equal(core.hasUnresolvedImmediateProblem(ledger), true);
});
