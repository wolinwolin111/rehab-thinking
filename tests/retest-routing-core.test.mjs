import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../app/retest-routing-core.ts", import.meta.url), "utf8");
const actionSource = await readFile(new URL("../app/action-identity-core.ts", import.meta.url), "utf8");
const actionCode = ts.transpileModule(actionSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const actionUrl = `data:text/javascript;base64,${Buffer.from(actionCode).toString("base64")}`;
const code = ts.transpileModule(source.replace('from "./action-identity-core"', `from "${actionUrl}"`), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const core = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);

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
